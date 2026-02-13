/* scroll-animations.js — Scrollytelling controller + reveals + progress */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.classList.add('js-enabled');

    // --- Scroll Progress Bar ---
    var progressBar = document.getElementById('scrollProgress');
    if (progressBar) {
      window.addEventListener('scroll', function () {
        var h = document.documentElement;
        var pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
        progressBar.style.width = pct + '%';
      }, { passive: true });
    }

    // --- Scroll Reveal (non-scrollytelling sections) ---
    var revealEls = document.querySelectorAll('.scroll-reveal');
    if (revealEls.length && 'IntersectionObserver' in window) {
      var revealObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      revealEls.forEach(function (el) { revealObs.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // --- Scrollytelling Controller ---
    var steps = document.querySelectorAll('.story-step');
    var charts = document.querySelectorAll('.panel-chart');
    var dots = document.querySelectorAll('.progress-dot');
    var chartPanelInner = document.querySelector('.chart-panel-inner');
    var isMobile = window.matchMedia('(max-width: 1024px)').matches;

    if (steps.length && 'IntersectionObserver' in window) {
      // Inject mobile inline chart divs
      steps.forEach(function (step) {
        var chartId = step.dataset.chart;
        if (chartId) {
          var mobileDiv = document.createElement('div');
          mobileDiv.className = 'mobile-chart';
          mobileDiv.id = 'mobile-' + chartId;
          step.appendChild(mobileDiv);
        }
      });

      var activeChartId = null;
      var activeStepIndex = 0;

      // Click handler for progress dots
      dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
          var idx = parseInt(dot.dataset.step, 10);
          if (steps[idx]) {
            steps[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });

      var stepObs = new IntersectionObserver(function (entries) {
        var bestEntry = null;
        var bestRatio = 0;
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        });

        if (!bestEntry) return;

        var chartId = bestEntry.target.dataset.chart;
        if (chartId === activeChartId) return;
        activeChartId = chartId;

        // Find active step index
        steps.forEach(function (s, i) {
          if (s === bestEntry.target) activeStepIndex = i;
        });

        // Deactivate all
        steps.forEach(function (s) { s.classList.remove('is-active'); });
        charts.forEach(function (c) { c.classList.remove('is-active'); });

        // Activate current step
        bestEntry.target.classList.add('is-active');

        // Update progress dots
        dots.forEach(function (d, i) {
          d.classList.remove('is-active', 'is-past');
          if (i === activeStepIndex) d.classList.add('is-active');
          else if (i < activeStepIndex) d.classList.add('is-past');
        });

        // Update figure label
        var figureLabel = document.getElementById('chartFigureLabel');
        var stepFigure = bestEntry.target.dataset.figure;
        if (figureLabel && stepFigure) figureLabel.textContent = stepFigure;

        // Chart panel shadow pulse
        if (chartPanelInner) {
          chartPanelInner.classList.add('transitioning');
          setTimeout(function () { chartPanelInner.classList.remove('transitioning'); }, 600);
        }

        // Activate chart
        var chartEl = document.getElementById(chartId);
        if (chartEl) {
          chartEl.classList.add('is-active');
          if (!chartEl.dataset.rendered && window.PLOTLY_CHART_REGISTRY && window.PLOTLY_CHART_REGISTRY[chartId]) {
            chartEl.dataset.rendered = '1';
            window.PLOTLY_CHART_REGISTRY[chartId](chartId);
            setTimeout(function () {
              if (window.Plotly && document.getElementById(chartId)) Plotly.Plots.resize(chartId);
            }, 100);
          } else if (chartEl.dataset.rendered) {
            setTimeout(function () {
              if (window.Plotly && document.getElementById(chartId)) Plotly.Plots.resize(chartId);
            }, 50);
          }
        }

        // Mobile inline charts
        var mobileChartEl = document.getElementById('mobile-' + chartId);
        if (mobileChartEl && !mobileChartEl.dataset.rendered && window.PLOTLY_CHART_REGISTRY && window.PLOTLY_CHART_REGISTRY[chartId]) {
          if (window.matchMedia('(max-width: 1024px)').matches) {
            mobileChartEl.dataset.rendered = '1';
            window.PLOTLY_CHART_REGISTRY[chartId]('mobile-' + chartId);
          }
        }

        // Animated counter
        var counterEl = bestEntry.target.querySelector('[data-count-to]');
        if (counterEl && !counterEl.dataset.counted) {
          counterEl.dataset.counted = '1';
          animateCounter(counterEl);
        }
      }, {
        threshold: [0.3, 0.5, 0.7],
        rootMargin: '-25% 0px -25% 0px'
      });

      steps.forEach(function (step) { stepObs.observe(step); });

      // Resize handler
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          var nowMobile = window.matchMedia('(max-width: 1024px)').matches;
          if (nowMobile !== isMobile) {
            isMobile = nowMobile;
            if (!isMobile && activeChartId) {
              setTimeout(function () {
                if (window.Plotly && document.getElementById(activeChartId)) Plotly.Plots.resize(activeChartId);
              }, 200);
            }
            if (isMobile && activeChartId) {
              var mEl = document.getElementById('mobile-' + activeChartId);
              if (mEl && !mEl.dataset.rendered && window.PLOTLY_CHART_REGISTRY && window.PLOTLY_CHART_REGISTRY[activeChartId]) {
                mEl.dataset.rendered = '1';
                window.PLOTLY_CHART_REGISTRY[activeChartId]('mobile-' + activeChartId);
              }
            }
          }
        }, 250);
      });
    }

    // --- Lazy Chart Rendering (non-scrollytelling) ---
    var chartEls = document.querySelectorAll('.plotly-chart');
    if (chartEls.length && 'IntersectionObserver' in window && window.PLOTLY_CHART_REGISTRY) {
      var chartObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var renderFn = window.PLOTLY_CHART_REGISTRY[el.id];
            if (renderFn && !el.dataset.rendered) {
              el.dataset.rendered = '1';
              renderFn(el.id);
            }
            chartObs.unobserve(el);
          }
        });
      }, { threshold: 0.05, rootMargin: '100px' });
      chartEls.forEach(function (el) { chartObs.observe(el); });
    }

    // --- Animated Counter (non-scrollytelling) ---
    var counterEls = document.querySelectorAll('[data-count-to]');
    if (counterEls.length && 'IntersectionObserver' in window) {
      var counterObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !entry.target.dataset.counted) {
            if (!entry.target.closest('.story-step')) {
              entry.target.dataset.counted = '1';
              animateCounter(entry.target);
            }
            counterObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counterEls.forEach(function (el) { counterObs.observe(el); });
    }
  });

  function animateCounter(el) {
    var target = parseFloat(el.dataset.countTo);
    var suffix = el.dataset.countSuffix || '%';
    var duration = 1500;
    var start = performance.now();
    var isInteger = target === Math.floor(target);

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var value = easeOut(progress) * target;
      el.textContent = isInteger ? Math.round(value) + suffix : value.toFixed(1) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    el.textContent = isInteger ? '0' + suffix : '0.0' + suffix;
    requestAnimationFrame(tick);
  }
})();
