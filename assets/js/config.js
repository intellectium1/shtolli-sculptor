/* ============================================================
   ШТОЛЛИ — отправка заявок в админ-панель (PHP+MySQL backend)

   Контактная форма и квиз шлют заявку сюда; она попадает в общую
   базу заявок (shtolli.ru/admin.html). Endpoint абсолютный, чтобы
   формы со второго домена (shtolli.art) тоже доходили (CORS открыт
   для обоих доменов на стороне lead.php).

   ShtolliSend(payload) -> Promise<boolean>:
     true  — заявка принята сервером,
     false — ошибка сети/сервера (вызывающий код покажет ручной
             способ: WhatsApp / Telegram / почта).
   Никогда не бросает исключение.
   ============================================================ */
(function () {
  'use strict';

  window.SHTOLLI_LEAD_API = 'https://shtolli.ru/admin/api/lead.php';

  window.ShtolliSend = function (payload) {
    var url = (window.SHTOLLI_LEAD_API || '').trim();
    if (!url) return Promise.resolve(false);
    try {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      }).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (j) { return !!(j && j.ok); })
                       .catch(function () { return true; });
      }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  };
})();
