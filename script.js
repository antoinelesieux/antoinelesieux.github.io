(function(){
  // --- GESTION DE LA LIGHTBOX ---
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCaption = document.getElementById('lightbox-caption');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var prevBtn = lightbox.querySelector('.lightbox-prev');
  var nextBtn = lightbox.querySelector('.lightbox-next');
  var lastFocused = null;
  var thumbs = [];
  var currentIndex = -1;

  function renderTrigger(trigger){
    var img = trigger.querySelector('img');
    if(!img) return;
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    var maxWidth = trigger.getAttribute('data-lightbox-max-width');
    if(maxWidth){
      lightboxImg.style.maxWidth = 'min(' + maxWidth + 'px, 90vw)';
      lightboxImg.style.maxHeight = 'none';
    } else {
      lightboxImg.style.maxWidth = '';
      lightboxImg.style.maxHeight = '';
    }
    var figure = trigger.closest('figure');
    var figcaption = figure ? figure.querySelector('figcaption') : null;
    lightboxCaption.textContent = figcaption ? figcaption.textContent : img.alt;
  }

  function updateNavVisibility(){
    var hasMultiple = thumbs.length > 1;
    prevBtn.style.display = hasMultiple ? '' : 'none';
    nextBtn.style.display = hasMultiple ? '' : 'none';
  }

  function openLightbox(trigger){
    lastFocused = trigger;

    if(trigger.id === 'leaflet-thumb-main'){
      var page1 = document.querySelector('.leaflet-hidden-pages .thumb');
      if(page1) trigger = page1;
    }
    
    thumbs = Array.from(document.querySelectorAll('.creation-card.filled .thumb:not(#leaflet-thumb-main):not([href])'));

    currentIndex = thumbs.indexOf(trigger);
    renderTrigger(trigger);
    updateNavVisibility();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function showAt(index){
    if(!thumbs.length) return;
    currentIndex = (index + thumbs.length) % thumbs.length;
    renderTrigger(thumbs[currentIndex]);
  }

  function showPrev(){ showAt(currentIndex - 1); }
  function showNext(){ showAt(currentIndex + 1); }

  function closeLightbox(){
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lightboxImg.src = '';
    document.removeEventListener('keydown', onKeydown);
    if(lastFocused){ lastFocused.focus(); }
  }

  // Correction de l'ordre de tabulation : Précédent -> Suivant -> Fermer
  function getFocusableEls(){
    var els = [];
    if(thumbs.length > 1){
      els.push(prevBtn);
      els.push(nextBtn);
    }
    els.push(closeBtn);
    return els;
  }

  function onKeydown(e){
    if(e.key === 'Escape'){ closeLightbox(); }
    if(e.key === 'ArrowLeft'){ showPrev(); }
    if(e.key === 'ArrowRight'){ showNext(); }
    if(e.key === 'Tab'){
      e.preventDefault();
      var focusable = getFocusableEls();
      var idx = focusable.indexOf(document.activeElement);
      var next;
      if(e.shiftKey){
        next = idx <= 0 ? focusable[focusable.length - 1] : focusable[idx - 1];
      } else {
        next = idx === -1 || idx === focusable.length - 1 ? focusable[0] : focusable[idx + 1];
      }
      next.focus();
    }
  }

  document.querySelectorAll('.creation-card.filled .thumb:not([href])').forEach(function(trigger){
    trigger.addEventListener('click', function(){ openLightbox(trigger); });
  });

  var leafletBtn = document.getElementById('leaflet-btn-open');
  var leafletThumbMain = document.getElementById('leaflet-thumb-main');
  if(leafletBtn && leafletThumbMain){
    leafletBtn.addEventListener('click', function(){
      openLightbox(leafletThumbMain);
    });
  }

  prevBtn.addEventListener('click', showPrev);
  nextBtn.addEventListener('click', showNext);

  lightbox.querySelectorAll('[data-close]').forEach(function(el){
    el.addEventListener('click', closeLightbox);
  });

  // --- GESTION DES EMAILS (CHARGEMENT DIFFÉRÉ + OUVERTURE DIRECTE) ---
  var previews = document.querySelectorAll('.email-preview');

  function loadEmailPreview(wrapper) {
    var id = wrapper.getAttribute('data-email-id');
    var emailUrl = wrapper.getAttribute('data-email-url');
    var iframe = wrapper.querySelector('iframe');
    var openBtn = document.querySelector('[data-email-open="' + id + '"]');
    
    if(!emailUrl || wrapper.classList.contains('is-loaded')) return;
    wrapper.classList.add('is-loaded');

    var DESKTOP_WIDTH = 700;
    iframe.style.width = DESKTOP_WIDTH + 'px';
    iframe.style.height = '1200px';

    function applyScale(){
      try{
        var doc = iframe.contentDocument;
        if(!doc || !doc.documentElement) return;
        var naturalWidth = DESKTOP_WIDTH;
        var naturalHeight = doc.documentElement.scrollHeight || 800;
        var containerWidth = wrapper.clientWidth;
        if(!containerWidth) return;
        var scale = containerWidth / naturalWidth;
        iframe.style.width = naturalWidth + 'px';
        iframe.style.height = naturalHeight + 'px';
        iframe.style.transform = 'scale(' + scale + ')';
        iframe.style.transformOrigin = 'top left';
      } catch(e){}
    }

    fetch(emailUrl)
      .then(function(response){
        if(!response.ok) throw new Error('Erreur de chargement');
        return response.text();
      })
      .then(function(html){
        iframe.srcdoc = html;

        iframe.addEventListener('load', function(){
          applyScale();
          if('ResizeObserver' in window){
            var ro = new ResizeObserver(function(){ applyScale(); });
            ro.observe(wrapper);
          } else {
            window.addEventListener('resize', applyScale);
          }
        });
      })
      .catch(function(err){
        console.error('Erreur lors du chargement de l\'emailing ' + id + ' :', err);
      });

    if(openBtn){
      openBtn.addEventListener('click', function(){
        window.open(emailUrl, '_blank', 'noopener,noreferrer');
      });
    }
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries, obs) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadEmailPreview(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '300px'
    });

    previews.forEach(function(preview) {
      observer.observe(preview);
    });
  } else {
    previews.forEach(function(preview) {
      loadEmailPreview(preview);
    });
  }
})();