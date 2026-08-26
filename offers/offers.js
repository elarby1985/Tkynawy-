(function () {
  const grid = document.querySelector('[data-offers-grid]');
  if (!grid || !Array.isArray(window.TYKNawyOffers)) return;
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const imageBase = lang === 'ar' ? '../../offers/images/' : 'images/';
  const logoPath = lang === 'ar' ? '../../images/tyknawy-logo-header.png' : '../images/tyknawy-logo-header.png';
  const number = '97471040746';
  const labels = lang === 'ar' ? { button: 'اطلب العرض', message: 'السلام عليكم، أريد الاستفسار عن' } : { button: 'Enquire on WhatsApp', message: 'Hello Tyknawy, I would like to enquire about' };

  window.TYKNawyOffers.filter((offer) => offer.active).forEach((offer) => {
    const text = offer[lang];
    const message = encodeURIComponent(`${labels.message} ${text.title} (${text.price}).`);
    const card = document.createElement('article');
    card.className = 'offer-card reveal is-visible';
    card.id = offer.id;
    card.innerHTML = `<div class="offer-brandbar"><div><img src="${logoPath}" alt=""><span><strong>TYKNAWY</strong><small>${lang === 'ar' ? 'للمقاولات' : 'FOR CONTRACTING'}</small></span></div><b>${text.tag}</b></div><div class="offer-image"><img src="${imageBase}${offer.image}" alt="${text.title}" loading="lazy"></div><div class="offer-content"><div class="offer-title-row"><div><h2>${text.title}</h2><small>${offer.id.replaceAll('-', ' ')}</small></div><strong>${text.price}</strong></div><p>${text.description}</p><a class="offer-enquire" href="https://wa.me/${number}?text=${message}" target="_blank" rel="noopener noreferrer">${labels.button}<span aria-hidden="true">→</span></a></div>`;
    grid.appendChild(card);
  });
})();
