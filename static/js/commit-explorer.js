/* commit-explorer.js — Interactive commit explorer with filters and navigation */
(function () {
  'use strict';

  var PAGE_SIZE = 1;
  var currentIndex = 0;
  var filteredCommits = [];
  var currentCodebase = 'vllm';
  var currentQuadrant = 'all';

  var AGENT_KEYS = ['claude_code', 'codex_cli', 'trae_sonnet', 'trae_gpt5'];
  var AGENT_LABELS = {
    claude_code: 'Claude Code',
    codex_cli: 'Codex CLI',
    trae_sonnet: 'TRAE (Sonnet)',
    trae_gpt5: 'TRAE (GPT-5)'
  };

  var QUADRANT_COLORS = { Q1: '#59a14f', Q2: '#edc948', Q3: '#f28e2b', Q4: '#e15759' };
  var QUADRANT_LABELS = { Q1: 'True Success', Q2: 'Good Intent', Q3: 'Lucky Win', Q4: 'Failure' };
  var HARD_COLORS = { beats: '#59a14f', similar: '#4e79a7', worse: '#e15759', NO_DATA: '#bab0ac' };
  var APPROACH_COLORS = {
    similar_approach: '#59a14f', valid_alternative: '#4e79a7',
    partial_solution: '#edc948', ineffective: '#e15759',
    other: '#b07aa1', unknown: '#bab0ac'
  };

  document.addEventListener('DOMContentLoaded', function () {
    var codebaseSelect = document.getElementById('explorer-codebase');
    var quadrantSelect = document.getElementById('explorer-quadrant');
    if (!codebaseSelect || !quadrantSelect) return;

    codebaseSelect.addEventListener('change', function () {
      currentCodebase = this.value;
      applyFilters();
    });
    quadrantSelect.addEventListener('change', function () {
      currentQuadrant = this.value;
      applyFilters();
    });

    document.getElementById('explorer-prev').addEventListener('click', function () {
      if (currentIndex > 0) { currentIndex--; renderCard(); }
    });
    document.getElementById('explorer-next').addEventListener('click', function () {
      if (currentIndex < filteredCommits.length - 1) { currentIndex++; renderCard(); }
    });

    applyFilters();
  });

  function applyFilters() {
    if (!window.ISO_BENCH_DATA) return;
    var data = window.ISO_BENCH_DATA[currentCodebase];
    if (!data) return;

    var commits = data.commits;
    if (currentQuadrant === 'all') {
      filteredCommits = commits;
    } else {
      filteredCommits = commits.filter(function (c) {
        return AGENT_KEYS.some(function (a) {
          return c.agents[a] && c.agents[a].quadrant === currentQuadrant;
        });
      });
    }

    currentIndex = 0;
    renderCard();
  }

  function renderCard() {
    var container = document.getElementById('explorer-cards');
    var counter = document.getElementById('explorer-counter');
    var prevBtn = document.getElementById('explorer-prev');
    var nextBtn = document.getElementById('explorer-next');

    if (!filteredCommits.length) {
      container.innerHTML = '<div class="explorer-empty">No commits match the current filters.</div>';
      counter.textContent = '0 / 0';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === filteredCommits.length - 1;
    counter.textContent = (currentIndex + 1) + ' / ' + filteredCommits.length;

    var commit = filteredCommits[currentIndex];
    var html = '<div class="explorer-card">';
    html += '<div class="explorer-card-header"><code>' + commit.hash + '</code>';
    html += '<span class="explorer-codebase-tag">' + currentCodebase.toUpperCase() + '</span></div>';

    html += '<div class="explorer-agents">';
    AGENT_KEYS.forEach(function (key) {
      var a = commit.agents[key];
      if (!a) return;
      html += '<div class="explorer-agent-row">';
      html += '<div class="explorer-agent-name">' + AGENT_LABELS[key] + '</div>';
      html += '<div class="explorer-badges">';
      html += badge(a.quadrant, QUADRANT_COLORS[a.quadrant], QUADRANT_LABELS[a.quadrant] || a.quadrant);
      html += badge(a.hard, HARD_COLORS[a.hard] || '#bab0ac', 'Hard: ' + a.hard);
      if (a.primary_pct !== null && a.primary_pct !== undefined) {
        var sign = a.primary_pct >= 0 ? '+' : '';
        html += '<span class="explorer-metric">' + sign + a.primary_pct + '% ' + (a.primary_metric || '') + '</span>';
      }
      html += badge(a.bottleneck, null, a.bottleneck.replace(/_/g, ' '));
      html += badge(a.approach, APPROACH_COLORS[a.approach] || '#bab0ac', a.approach.replace(/_/g, ' '));
      html += '</div>';
      if (a.summary) {
        html += '<div class="explorer-summary">' + escapeHtml(a.summary) + '</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';

    container.innerHTML = html;
  }

  function badge(text, color, label) {
    var style = color ? ' style="background:' + color + ';color:' + contrastColor(color) + '"' : '';
    return '<span class="explorer-badge"' + style + '>' + (label || text) + '</span>';
  }

  function contrastColor(hex) {
    if (!hex || hex[0] !== '#') return '#fff';
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#1e293b' : '#ffffff';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
