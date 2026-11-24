/* Olson reading presentation — navigation + presenter tools
   Edit these two lines to change the team and the talk length. */
(function(){
  var PRESENTERS=['Assemay','Zhamilya'];
  var TOTAL_MIN=20;

  var stage=document.getElementById('stage');
  var slides=[].slice.call(stage.querySelectorAll('.slide'));
  var N=slides.length, i=0;
  var params=new URLSearchParams(location.search);

  slides.forEach(function(s,k){var n=s.querySelector('.num'); if(n) n.textContent=(k+1);});

  /* ---------- build UI ---------- */
  var ui=document.createElement('div'); ui.id='ui';
  ui.innerHTML=
   '<div id="toolbar" role="toolbar" aria-label="Presentation tools">'+
     '<button id="bPrev" title="Previous (←)" aria-label="Previous slide">‹</button>'+
     '<span class="count" id="count"></span>'+
     '<button id="bNext" title="Next (→)" aria-label="Next slide">›</button>'+
     '<span class="sep"></span>'+
     '<button id="bGrid" title="All slides (G)">Slides</button>'+
     '<span class="sep"></span>'+
     '<span id="timer" title="Click to start / pause (T)">20:00</span>'+
     '<button id="bPlay" title="Start / pause (T)" aria-label="Start or pause timer">▶</button>'+
     '<button id="bReset" title="Reset timer (R)" aria-label="Reset timer">↺</button>'+
     '<button id="bMinus" title="1 minute less (−)">−1</button>'+
     '<button id="bPlus" title="1 minute more (+)">+1</button>'+
     '<span class="sep"></span>'+
     PRESENTERS.map(function(p,k){return '<button class="chip" data-p="'+k+'" title="Speaker '+(k+1)+' (P switches)"><span>'+p+'</span><span class="t">0:00</span></button>';}).join('')+
     '<span class="sep"></span>'+
     '<button id="bNotes" title="Speaker notes (N)">Notes</button>'+
     '<button id="bNight" title="Night mode (D)">Night</button>'+
     '<button id="bFull" title="Fullscreen (F)">Full</button>'+
     '<button id="bHelp" title="Shortcuts (?)">?</button>'+
   '</div>';
  document.body.appendChild(ui);

  var progress=document.createElement('div'); progress.id='progress'; document.body.appendChild(progress);
  var toast=document.createElement('div'); toast.id='toast'; document.body.appendChild(toast);
  var notes=document.createElement('div'); notes.id='notes'; document.body.appendChild(notes);

  var grid=document.createElement('div'); grid.className='overlay'; grid.id='overview';
  grid.innerHTML='<div class="ov-title">All slides — click to jump · Esc to close</div><div id="grid"></div>';
  document.body.appendChild(grid);
  var help=document.createElement('div'); help.className='overlay'; help.id='help';
  help.innerHTML='<div class="box"><h3>Shortcuts</h3><table>'+
    '<tr><td>← / →</td><td>Previous / next slide (also click or swipe)</td></tr>'+
    '<tr><td>G</td><td>All slides (jump to any slide)</td></tr>'+
    '<tr><td>T</td><td>Start / pause the timer</td></tr>'+
    '<tr><td>R</td><td>Reset the timer and speaking times</td></tr>'+
    '<tr><td>+ / −</td><td>Add / remove one minute</td></tr>'+
    '<tr><td>P</td><td>Hand over to the other presenter</td></tr>'+
    '<tr><td>N</td><td>Speaker notes</td></tr>'+
    '<tr><td>D</td><td>Night mode</td></tr>'+
    '<tr><td>F</td><td>Fullscreen</td></tr>'+
    '<tr><td>Ctrl/Cmd + P</td><td>Print or save as PDF (one slide per page)</td></tr>'+
    '</table></div>';
  document.body.appendChild(help);

  var $=function(id){return document.getElementById(id);};
  var chips=[].slice.call(ui.querySelectorAll('.chip'));

  /* ---------- slides ---------- */
  function show(n,silent){
    i=Math.min(Math.max(n,0),N-1);
    slides.forEach(function(s,k){s.classList.toggle('active',k===i);});
    $('count').textContent=(i+1)+' / '+N;
    progress.style.width=(N>1? i/(N-1)*100:100)+'%';
    try{history.replaceState(null,'',location.pathname+location.search+'#'+(i+1));}catch(e){}
    var ps=slides[i].getAttribute('data-presenter');
    if(ps!==null && ps!=='' && !silent){ setSpeaker(parseInt(ps,10),true); }
    renderNotes();
  }
  function fromHash(){var n=parseInt((location.hash||'').replace('#',''),10);return isNaN(n)?0:n-1;}
  function fit(){var s=Math.min(window.innerWidth/1440,window.innerHeight/810);stage.style.transform='translate(-50%,-50%) scale('+s+')'; if(grid.classList.contains('open')) scaleThumbs();}

  /* ---------- timer + presenters ---------- */
  var total=TOTAL_MIN*60000, remaining=total, running=false, last=0, speaker=0, speak=PRESENTERS.map(function(){return 0;});
  function fmt(ms,plus){var s=Math.floor(Math.abs(ms)/1000),m=Math.floor(s/60);s=s%60;return (plus?'+':'')+m+':'+(s<10?'0':'')+s;}
  function paint(){
    var t=$('timer'); t.textContent=remaining<0?fmt(remaining,true):fmt(Math.ceil(remaining/1000)*1000);
    t.className=remaining<=0?'late':(remaining<=180000?'warn':'');
    $('bPlay').textContent=running?'❚❚':'▶'; $('bPlay').classList.toggle('on',running);
    chips.forEach(function(c,k){c.classList.toggle('on',k===speaker); c.querySelector('.t').textContent=fmt(speak[k]);});
  }
  function tick(){
    if(!running) return;
    var now=Date.now(), dt=now-last; last=now;
    remaining-=dt; if(speaker!==null) speak[speaker]+=dt;
    paint();
  }
  setInterval(tick,250);
  function toggleTimer(){running=!running; last=Date.now(); paint(); say(running?'Timer running':'Timer paused');}
  function resetTimer(){running=false; remaining=total; speak=speak.map(function(){return 0;}); paint(); say('Timer reset');}
  function adjust(min){total=Math.max(60000,total+min*60000); remaining+=min*60000; paint(); say('Talk length '+Math.round(total/60000)+' min');}
  function setSpeaker(k,fromSlide){
    k=(k+PRESENTERS.length)%PRESENTERS.length; if(k===speaker) return;
    speaker=k; paint(); say('Handover → '+PRESENTERS[speaker]);
  }
  var toastT; function say(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){toast.classList.remove('show');},1600);}

  /* ---------- notes ---------- */
  function renderNotes(){
    var txt=slides[i].getAttribute('data-notes')||'No notes for this slide.';
    notes.innerHTML='<h4>Speaker notes · slide '+(i+1)+'</h4>'+txt.replace(/</g,'&lt;');
  }
  function toggleNotes(){notes.classList.toggle('open'); $('bNotes').classList.toggle('on',notes.classList.contains('open'));}

  /* ---------- overview ---------- */
  var built=false;
  function scaleThumbs(){
    [].forEach.call(document.querySelectorAll('#grid .thumb'),function(t){
      var w=t.clientWidth; t.querySelector('.inner').style.transform='scale('+(w/1440)+')';
    });
  }
  function openGrid(){
    if(!built){
      var g=$('grid');
      slides.forEach(function(s,k){
        var t=document.createElement('div'); t.className='thumb'; t.setAttribute('role','button'); t.setAttribute('tabindex','0');
        var inner=document.createElement('div'); inner.className='inner';
        var c=s.cloneNode(true); c.classList.remove('active'); inner.appendChild(c); t.appendChild(inner);
        var n=document.createElement('span'); n.className='n'; n.textContent=(k+1); t.appendChild(n);
        t.addEventListener('click',function(){closeOverlays();show(k);});
        t.addEventListener('keydown',function(e){if(e.key==='Enter'){closeOverlays();show(k);}});
        g.appendChild(t);
      });
      built=true;
    }
    [].forEach.call(document.querySelectorAll('#grid .thumb'),function(t,k){t.classList.toggle('cur',k===i);});
    grid.classList.add('open'); scaleThumbs();
  }
  function closeOverlays(){grid.classList.remove('open'); help.classList.remove('open');}
  function toggleGrid(){grid.classList.contains('open')?closeOverlays():openGrid();}

  /* ---------- misc tools ---------- */
  function night(on,persist){document.body.classList.toggle('night',on); $('bNight').classList.toggle('on',on); if(persist){try{localStorage.setItem('olson-night',on?'1':'0');}catch(e){}}}
  function full(){try{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); }catch(e){}}

  /* ---------- wiring ---------- */
  $('bPrev').onclick=function(){show(i-1);}; $('bNext').onclick=function(){show(i+1);};
  $('bGrid').onclick=toggleGrid; $('bPlay').onclick=toggleTimer; $('timer').onclick=toggleTimer;
  $('bReset').onclick=resetTimer; $('bMinus').onclick=function(){adjust(-1);}; $('bPlus').onclick=function(){adjust(1);};
  chips.forEach(function(c){c.onclick=function(){setSpeaker(parseInt(c.getAttribute('data-p'),10));};});
  $('bNotes').onclick=toggleNotes; $('bNight').onclick=function(){night(!document.body.classList.contains('night'),true);};
  $('bFull').onclick=full; $('bHelp').onclick=function(){help.classList.toggle('open');};
  help.addEventListener('click',closeOverlays);

  window.addEventListener('resize',fit);
  window.addEventListener('hashchange',function(){show(fromHash(),true);});
  window.addEventListener('keydown',function(e){
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    var k=e.key;
    if(k==='Escape'){closeOverlays(); return;}
    if(grid.classList.contains('open') && k!=='g' && k!=='G') return;
    if(['ArrowRight','PageDown',' ','Enter'].indexOf(k)>-1){e.preventDefault();show(i+1);}
    else if(['ArrowLeft','PageUp','Backspace'].indexOf(k)>-1){e.preventDefault();show(i-1);}
    else if(k==='Home')show(0); else if(k==='End')show(N-1);
    else if(k==='g'||k==='G')toggleGrid();
    else if(k==='t'||k==='T')toggleTimer();
    else if(k==='r'||k==='R')resetTimer();
    else if(k==='+'||k==='=')adjust(1);
    else if(k==='-'||k==='_')adjust(-1);
    else if(k==='p'||k==='P')setSpeaker(speaker+1);
    else if(k==='n'||k==='N')toggleNotes();
    else if(k==='d'||k==='D')night(!document.body.classList.contains('night'),true);
    else if(k==='f'||k==='F')full();
    else if(k==='?'||k==='h'||k==='H')help.classList.toggle('open');
  });
  stage.addEventListener('click',function(e){show(e.clientX>window.innerWidth/2?i+1:i-1);});
  var tx=null;
  window.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});
  window.addEventListener('touchend',function(e){if(tx===null)return;var d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50)show(d<0?i+1:i-1);tx=null;});

  /* toolbar auto-hides when the mouse is still */
  var idleT, pinned=params.has('ui');
  function wake(){ui.classList.remove('idle'); clearTimeout(idleT); if(!pinned) idleT=setTimeout(function(){ if(!ui.matches(':hover')&&!grid.classList.contains('open')) ui.classList.add('idle');},3000);}
  window.addEventListener('mousemove',wake); window.addEventListener('keydown',wake); window.addEventListener('touchstart',wake,{passive:true});

  /* init */
  var saved=null; try{saved=localStorage.getItem('olson-night');}catch(e){}
  night(params.has('night')||saved==='1');
  fit(); paint(); show(fromHash(),true); wake();
  requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready');});});
})();
