/* plotly-charts.js — All 9 Plotly chart render functions (lazy) */
(function () {
  'use strict';

  var AGENTS = ['Claude Code', 'Codex CLI', 'TRAE (Sonnet)', 'TRAE (GPT-5)'];

  var C = {
    vllm: '#4e79a7', sglang: '#e15759',
    hard: '#a0cbe8', true_s: '#4e79a7',
    q1: '#59a14f', q2: '#edc948', q3: '#f28e2b', q4: '#e15759',
    similar: '#59a14f', alternative: '#4e79a7', partial: '#edc948', ineffective: '#e15759', other: '#b07aa1', unknown: '#bab0ac'
  };

  var LAYOUT_BASE = {
    font: { family: 'Inter, sans-serif', size: 12, color: '#64748b' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 50, r: 24, t: 48, b: 64 },
    bargap: 0.25,
    bargroupgap: 0.1,
    autosize: true
  };

  var TITLE_FONT = { size: 13, weight: 600, color: '#1e293b' };

  var CONFIG = { displaylogo: false, responsive: true, toImageButtonOptions: { format: 'svg', filename: 'iso-bench-chart' }, modeBarButtonsToRemove: ['lasso2d', 'select2d'] };

  function merge(base, ext) {
    var out = {};
    for (var k in base) out[k] = base[k];
    for (var k2 in ext) {
      if (typeof ext[k2] === 'object' && ext[k2] !== null && !Array.isArray(ext[k2]) && typeof base[k2] === 'object') {
        out[k2] = merge(base[k2], ext[k2]);
      } else {
        out[k2] = ext[k2];
      }
    }
    return out;
  }

  function pctText(vals) { return vals.map(function (v) { return v + '%'; }); }
  function countText(vals) { return vals.map(function (v) { return v + ' tasks'; }); }

  // 1. True Success Rate — grouped bar, 4 agents x 2 codebases
  window.renderTrueSuccess = function (id) {
    Plotly.newPlot(id, [
      { x: AGENTS, y: [46.2, 20.5, 28.2, 17.9], name: 'vLLM (39 tasks)', type: 'bar', marker: { color: C.vllm, line: { width: 0 } }, text: pctText([46.2, 20.5, 28.2, 17.9]), hovertemplate: '%{x}<br>vLLM: %{y}%<extra></extra>' },
      { x: AGENTS, y: [26.7, 80.0, 80.0, 86.7], name: 'SGLang (15 tasks)', type: 'bar', marker: { color: C.sglang, line: { width: 0 } }, text: pctText([26.7, 80.0, 80.0, 86.7]), hovertemplate: '%{x}<br>SGLang: %{y}%<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'True Success Rate by Agent and Codebase', font: TITLE_FONT },
      yaxis: { range: [0, 100], ticksuffix: '%', gridcolor: '#eef1f5', gridwidth: 1 },
      xaxis: { tickangle: 0 },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      barmode: 'group'
    }), CONFIG);
  };

  // 2. Hard vs True — vLLM
  window.renderHardVsTrueVllm = function (id) {
    Plotly.newPlot(id, [
      { x: AGENTS, y: [56.4, 33.3, 33.3, 20.5], name: 'Hard Success', type: 'bar', marker: { color: C.hard }, hovertemplate: '%{x}<br>Hard: %{y}%<extra></extra>' },
      { x: AGENTS, y: [46.2, 20.5, 28.2, 17.9], name: 'True Success', type: 'bar', marker: { color: C.true_s }, hovertemplate: '%{x}<br>True: %{y}%<br>Gap: ' + [10.2, 12.8, 5.1, 2.6].map(function (v) { return v + '%'; }).join(',') + '<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'Hard Success vs. True Success \u2014 vLLM (n=39)', font: TITLE_FONT },
      yaxis: { range: [0, 70], ticksuffix: '%', gridcolor: '#eef1f5', gridwidth: 1 },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      barmode: 'group'
    }), CONFIG);
  };

  // 3. Hard vs True — SGLang
  window.renderHardVsTrueSglang = function (id) {
    Plotly.newPlot(id, [
      { x: AGENTS, y: [46.7, 80.0, 80.0, 86.7], name: 'Hard Success', type: 'bar', marker: { color: C.hard }, hovertemplate: '%{x}<br>Hard: %{y}%<extra></extra>' },
      { x: AGENTS, y: [26.7, 80.0, 80.0, 86.7], name: 'True Success', type: 'bar', marker: { color: C.true_s }, hovertemplate: '%{x}<br>True: %{y}%<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'Hard Success vs. True Success \u2014 SGLang (n=15)', font: TITLE_FONT },
      yaxis: { range: [0, 100], ticksuffix: '%', gridcolor: '#eef1f5', gridwidth: 1 },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      barmode: 'group'
    }), CONFIG);
  };

  // Helper: stacked bar data builder
  function stackedQuadrant(q1, q2, q3, q4) {
    return [
      { x: AGENTS, y: q1, name: 'Q1 True Success', type: 'bar', marker: { color: C.q1 }, hovertemplate: '%{x}<br>Q1: %{y} tasks<extra></extra>' },
      { x: AGENTS, y: q2, name: 'Q2 Good Intent', type: 'bar', marker: { color: C.q2 }, hovertemplate: '%{x}<br>Q2: %{y} tasks<extra></extra>' },
      { x: AGENTS, y: q3, name: 'Q3 Lucky Win', type: 'bar', marker: { color: C.q3 }, hovertemplate: '%{x}<br>Q3: %{y} tasks<extra></extra>' },
      { x: AGENTS, y: q4, name: 'Q4 Failure', type: 'bar', marker: { color: C.q4 }, hovertemplate: '%{x}<br>Q4: %{y} tasks<extra></extra>' }
    ];
  }

  // 4. Quadrant Distribution — vLLM
  window.renderQuadrantVllm = function (id) {
    Plotly.newPlot(id,
      stackedQuadrant([18, 8, 11, 7], [15, 20, 20, 27], [4, 5, 2, 1], [2, 6, 6, 4]),
      merge(LAYOUT_BASE, {
        title: { text: 'Quadrant Distribution \u2014 vLLM (n=39)', font: TITLE_FONT },
        barmode: 'stack',
        yaxis: { range: [0, 39], gridcolor: '#eef1f5', gridwidth: 1, title: 'Tasks' },
        legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 11 } }
      }), CONFIG);
  };

  // 5. Quadrant Distribution — SGLang
  window.renderQuadrantSglang = function (id) {
    Plotly.newPlot(id,
      stackedQuadrant([4, 12, 12, 13], [8, 3, 3, 2], [3, 0, 0, 0], [0, 0, 0, 0]),
      merge(LAYOUT_BASE, {
        title: { text: 'Quadrant Distribution \u2014 SGLang (n=15)', font: TITLE_FONT },
        barmode: 'stack',
        yaxis: { range: [0, 15], gridcolor: '#eef1f5', gridwidth: 1, title: 'Tasks' },
        legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 11 } }
      }), CONFIG);
  };

  // 6. Good Intent — vLLM (replaces PNG)
  window.renderGoodIntentVllm = function (id) {
    var correctTarget = [84.6, 71.8, 79.5, 87.2];
    var trueSuccess = [46.2, 20.5, 28.2, 17.9];
    Plotly.newPlot(id, [
      { x: AGENTS, y: correctTarget, name: 'Correct Target (Q1+Q2)', type: 'bar', marker: { color: '#a0cbe8' }, hovertemplate: '%{x}<br>Correct Target: %{y}%<extra></extra>' },
      { x: AGENTS, y: trueSuccess, name: 'True Success (Q1)', type: 'bar', marker: { color: C.vllm }, hovertemplate: '%{x}<br>True Success: %{y}%<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'Bottleneck Identification vs. True Success \u2014 vLLM (n=39)', font: TITLE_FONT },
      yaxis: { range: [0, 100], ticksuffix: '%', gridcolor: '#eef1f5', gridwidth: 1 },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      barmode: 'group'
    }), CONFIG);
  };

  // 7. Good Intent — SGLang (replaces PNG)
  window.renderGoodIntentSglang = function (id) {
    var correctTarget = [80.0, 100.0, 100.0, 100.0];
    var trueSuccess = [26.7, 80.0, 80.0, 86.7];
    Plotly.newPlot(id, [
      { x: AGENTS, y: correctTarget, name: 'Correct Target (Q1+Q2)', type: 'bar', marker: { color: '#f5a0a2' }, hovertemplate: '%{x}<br>Correct Target: %{y}%<extra></extra>' },
      { x: AGENTS, y: trueSuccess, name: 'True Success (Q1)', type: 'bar', marker: { color: C.sglang }, hovertemplate: '%{x}<br>True Success: %{y}%<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'Bottleneck Identification vs. True Success \u2014 SGLang (n=15)', font: TITLE_FONT },
      yaxis: { range: [0, 100], ticksuffix: '%', gridcolor: '#eef1f5', gridwidth: 1 },
      legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      barmode: 'group'
    }), CONFIG);
  };

  // 8. Approach Distribution — vLLM (replaces PNG)
  window.renderApproachVllm = function (id) {
    // Paper values for 39-commit subset
    var similar =      [3,  3,  11, 17];
    var alternative =  [14, 17, 7,  10];
    var partial =      [14, 9,  10, 8];
    var ineffective =  [8,  10, 10, 3];
    var other =        [0,  0,  1,  1];
    Plotly.newPlot(id, [
      { x: AGENTS, y: similar, name: 'Similar Approach', type: 'bar', marker: { color: C.similar }, hovertemplate: '%{x}<br>Similar: %{y}<extra></extra>' },
      { x: AGENTS, y: alternative, name: 'Valid Alternative', type: 'bar', marker: { color: C.alternative }, hovertemplate: '%{x}<br>Alternative: %{y}<extra></extra>' },
      { x: AGENTS, y: partial, name: 'Partial Solution', type: 'bar', marker: { color: C.partial }, hovertemplate: '%{x}<br>Partial: %{y}<extra></extra>' },
      { x: AGENTS, y: ineffective, name: 'Ineffective', type: 'bar', marker: { color: C.ineffective }, hovertemplate: '%{x}<br>Ineffective: %{y}<extra></extra>' },
      { x: AGENTS, y: other, name: 'Other', type: 'bar', marker: { color: C.other }, hovertemplate: '%{x}<br>Other: %{y}<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'Approach Distribution \u2014 vLLM (n=39)', font: TITLE_FONT },
      barmode: 'stack',
      yaxis: { range: [0, 39], gridcolor: '#eef1f5', gridwidth: 1, title: 'Tasks' },
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 10 } }
    }), CONFIG);
  };

  // 9. Approach Distribution — SGLang (replaces PNG)
  window.renderApproachSglang = function (id) {
    var similar =      [0, 8,  8,  8];
    var alternative =  [5, 4,  2,  2];
    var partial =      [8, 3,  5,  5];
    var ineffective =  [2, 0,  0,  0];
    Plotly.newPlot(id, [
      { x: AGENTS, y: similar, name: 'Similar Approach', type: 'bar', marker: { color: C.similar }, hovertemplate: '%{x}<br>Similar: %{y}<extra></extra>' },
      { x: AGENTS, y: alternative, name: 'Valid Alternative', type: 'bar', marker: { color: C.alternative }, hovertemplate: '%{x}<br>Alternative: %{y}<extra></extra>' },
      { x: AGENTS, y: partial, name: 'Partial Solution', type: 'bar', marker: { color: C.partial }, hovertemplate: '%{x}<br>Partial: %{y}<extra></extra>' },
      { x: AGENTS, y: ineffective, name: 'Ineffective', type: 'bar', marker: { color: C.ineffective }, hovertemplate: '%{x}<br>Ineffective: %{y}<extra></extra>' }
    ], merge(LAYOUT_BASE, {
      title: { text: 'Approach Distribution \u2014 SGLang (n=15)', font: TITLE_FONT },
      barmode: 'stack',
      yaxis: { range: [0, 15], gridcolor: '#eef1f5', gridwidth: 1, title: 'Tasks' },
      legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 10 } }
    }), CONFIG);
  };

  // Registry for lazy rendering
  window.PLOTLY_CHART_REGISTRY = {
    'trueSuccessChart': window.renderTrueSuccess,
    'hardVsTrueVllmChart': window.renderHardVsTrueVllm,
    'hardVsTrueSglangChart': window.renderHardVsTrueSglang,
    'quadrantVllmChart': window.renderQuadrantVllm,
    'quadrantSglangChart': window.renderQuadrantSglang,
    'goodIntentVllmChart': window.renderGoodIntentVllm,
    'goodIntentSglangChart': window.renderGoodIntentSglang,
    'approachVllmChart': window.renderApproachVllm,
    'approachSglangChart': window.renderApproachSglang
  };
})();
