const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');
function closeNav() { nav?.classList.remove('is-open'); navToggle?.setAttribute('aria-expanded','false'); navToggle?.setAttribute('aria-label',navToggle.dataset.openLabel || 'Open navigation menu'); document.body.classList.remove('menu-open'); }
navToggle?.addEventListener('click', () => { const open = nav?.classList.toggle('is-open') ?? false; navToggle.setAttribute('aria-expanded', String(open)); navToggle.setAttribute('aria-label',open ? (navToggle.dataset.closeLabel || 'Close navigation menu') : (navToggle.dataset.openLabel || 'Open navigation menu')); document.body.classList.toggle('menu-open', open); });
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click',closeNav));
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeNav();});
document.addEventListener('click',e=>{if(nav?.classList.contains('is-open') && !e.target.closest('.site-header'))closeNav();});
const form = document.querySelector('#quote-request-form');
document.querySelectorAll('[data-select-service]').forEach(link=>link.addEventListener('click',()=>{const select=form?.querySelector('select[name="service"]');if(select)select.value=link.dataset.selectService;}));
form?.addEventListener('submit', e=>{
 e.preventDefault();
 if(!form.reportValidity())return;
 const data=new FormData(form);
 const arabic=document.documentElement.lang==='ar';
 const labels={name:arabic?'الاسم':'Name',email:arabic?'البريد':'Email',phone:arabic?'الهاتف':'Phone',service:arabic?'الخدمة':'Service',message:arabic?'التفاصيل':'Details'};
 const lines=[arabic?'مرحباً تيكناوي، أود طلب استشارة / عرض سعر:':'Hello Tyknawy, I would like to request a consultation / quotation:'];
 for(const [key,label] of Object.entries(labels)){
  const control=form.elements.namedItem(key);
  const value=key==='service' && control?.selectedOptions?.length ? control.selectedOptions[0].textContent : data.get(key);
  if(value && String(value).trim()) lines.push(`${label}: ${String(value).trim()}`);
 }
 // Include any additional form fields without silently dropping project details
 for(const [key,value] of data.entries()) if(!['form-name','bot-field','subject',...Object.keys(labels)].includes(key)&&String(value).trim())lines.push(`${key}: ${String(value).trim()}`);
 const url='https://wa.me/97471040746?text='+encodeURIComponent(lines.join('\n'));
 const status=form.querySelector('.form-status');
 if(status){status.textContent=arabic?'تم تجهيز رسالتك. اضغط على الرابط لإكمال الإرسال في واتساب.':'Your message is ready. Use the link to finish sending it in WhatsApp.';const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=arabic?'فتح واتساب':'Open WhatsApp';status.append(' ',a);}
 window.open(url,'_blank','noopener,noreferrer');
});
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) { const observer=new IntersectionObserver((entries,obs)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');obs.unobserve(entry.target);}});},{threshold:0.1,rootMargin:'0px 0px -30px'});revealItems.forEach(item=>observer.observe(item));}else{revealItems.forEach(item=>item.classList.add('is-visible'));}
