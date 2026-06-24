"""Deploy the ShTOLLI site to reg.ru shared hosting over SFTP.

Credentials are read from environment variables ONLY (never hard-coded):

    REGRU_HOST   server IP / host
    REGRU_USER   SFTP login
    REGRU_PASS   SFTP password   (required)
    REGRU_PORT   SFTP port (default 22)

Targets:
    www/shtolli.ru   -> full site  (primary domain, canonical)
    www/shtolli.art  -> gallery (gallery.html as index.html) + blog only

Usage (PowerShell):
    $env:REGRU_HOST="..."; $env:REGRU_USER="..."; $env:REGRU_PASS="..."
    python deploy_regru.py all        # ru + art + art cleanup
    python deploy_regru.py ru         # only shtolli.ru
    python deploy_regru.py art        # only shtolli.art (upload)
    python deploy_regru.py art-clean  # only remove stale files from shtolli.art
"""
import os
import sys
import stat as statmod

import paramiko

HOST = os.environ.get("REGRU_HOST")
USER = os.environ.get("REGRU_USER")
PASS = os.environ.get("REGRU_PASS")
PORT = int(os.environ.get("REGRU_PORT", "22"))

LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))

# Never deployed to either domain.
EXCLUDE_TOPDIRS = {"docs", ".git", ".github", ".claude", "__pycache__", "img"}
EXCLUDE_NAMES = {
    "admin.html", "support.js", "image-slot.js", "README.md", ".thumbnail",
    ".gitignore", ".image-slots.state.json", "_manifest.json",
    "gallery.html", "robots-art.txt", "sitemap-art.xml",
}
# Extra exclusions for the lean art domain.
ART_EXCLUDE_TOPDIRS = {"services"}
ART_EXCLUDE_ROOT_FILES = {"index.html", "robots.txt", "sitemap.xml"}
# Stale paths to purge from the art docroot (old full-site mirror + dev leftovers).
ART_PURGE = [
    "services", "docs", "img",
    "admin.html", "support.js", "image-slot.js", "README.md", ".thumbnail",
    "sftp_deploy_retry.py", "sftp_deploy.py", "deploy.py",
    "ftp_ls.py", "ftp_ls_www.py", "ftp_test.py", "upload_htaccess.py",
]


def excluded(rel):
    parts = rel.split("/")
    if parts[0] in EXCLUDE_TOPDIRS:
        return True
    name = parts[-1]
    if name in EXCLUDE_NAMES:
        return True
    if name.endswith(".py") or name.endswith(".md"):
        return True
    if name.startswith(".ht") and name != ".htaccess":
        return True
    return False


def connect():
    t = paramiko.Transport((HOST, PORT))
    t.connect(username=USER, password=PASS)
    return t, paramiko.SFTPClient.from_transport(t)


def ensure_dir(sftp, d):
    cur = ""
    for p in d.split("/"):
        if not p:
            continue
        cur = cur + "/" + p if cur else p
        try:
            sftp.stat(cur)
        except IOError:
            sftp.mkdir(cur)


def put(sftp, local, remote):
    ensure_dir(sftp, "/".join(remote.split("/")[:-1]))
    sftp.put(local, remote)
    print("  put", remote)


def rmtree(sftp, path):
    try:
        st = sftp.stat(path)
    except IOError:
        return
    if statmod.S_ISDIR(st.st_mode):
        for n in sftp.listdir(path):
            rmtree(sftp, path + "/" + n)
        sftp.rmdir(path)
    else:
        sftp.remove(path)
    print("  removed", path)


def walk_files():
    for root, dirs, files in os.walk(LOCAL_ROOT):
        relroot = os.path.relpath(root, LOCAL_ROOT).replace("\\", "/")
        relroot = "" if relroot == "." else relroot
        dirs[:] = [
            d for d in dirs
            if not excluded((relroot + "/" + d).lstrip("/"))
        ]
        for f in files:
            rel = (relroot + "/" + f).lstrip("/")
            yield root, f, rel


def deploy_ru(sftp):
    target = "www/shtolli.ru"
    ensure_dir(sftp, target)
    for root, f, rel in walk_files():
        if excluded(rel):
            continue
        put(sftp, os.path.join(root, f), target + "/" + rel)


def deploy_art(sftp):
    target = "www/shtolli.art"
    ensure_dir(sftp, target)
    for root, f, rel in walk_files():
        if excluded(rel):
            continue
        if rel.split("/")[0] in ART_EXCLUDE_TOPDIRS:
            continue
        if rel in ART_EXCLUDE_ROOT_FILES:
            continue
        put(sftp, os.path.join(root, f), target + "/" + rel)
    # Art-specific variants.
    put(sftp, os.path.join(LOCAL_ROOT, "gallery.html"), target + "/index.html")
    put(sftp, os.path.join(LOCAL_ROOT, "robots-art.txt"), target + "/robots.txt")
    put(sftp, os.path.join(LOCAL_ROOT, "sitemap-art.xml"), target + "/sitemap.xml")


def cleanup_art(sftp):
    base = "www/shtolli.art"
    for p in ART_PURGE:
        rmtree(sftp, base + "/" + p)


def main():
    if not (HOST and USER and PASS):
        sys.exit("Set REGRU_HOST, REGRU_USER and REGRU_PASS environment variables first.")
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    t, sftp = connect()
    print("Connected to", HOST)
    try:
        if mode in ("ru", "all"):
            print("== shtolli.ru (full site) ==")
            deploy_ru(sftp)
        if mode in ("art", "all"):
            print("== shtolli.art (gallery + blog) ==")
            deploy_art(sftp)
        if mode in ("art-clean", "clean", "all"):
            print("== shtolli.art cleanup (remove stale/dev files) ==")
            cleanup_art(sftp)
    finally:
        sftp.close()
        t.close()
    print("DONE:", mode)


if __name__ == "__main__":
    main()
