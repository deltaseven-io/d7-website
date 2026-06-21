      let col = "e_hrr",
        dir = 1,
        minG = 0,
        q = "",
        slateOnly = true,
        selectedGame = null;

      const TIERS = [
        { max: 1.2, bg: "#a93226", fg: "#000" },
        { max: 1.8, bg: "#cb4335", fg: "#000" },
        { max: 2.5, bg: "#c9a800", fg: "#000" },
        { max: 3.5, bg: "#00c853", fg: "#fff" },
        { max: 999, bg: "#145a32", fg: "#fff" },
      ];
      function tier(v) {
        return TIERS.find((t) => v < t.max) || TIERS[4];
      }
      function hcell(v, dec = 2) {
        if (v == null) return '<span class="na-cell">—</span>';
        const t = tier(+v);
        return `<span class="hcell" style="background:${t.bg};color:${t.fg}">${(+v).toFixed(dec)}</span>`;
      }
      function pcell(v) {
        const bg =
          v >= 50
            ? "#00c853"
            : v >= 35
              ? "#c9a800"
              : v >= 20
                ? "#cb4335"
                : "#a93226";
        const fg =
          v >= 50 ? "#fff" : v >= 35 ? "#000" : v >= 20 ? "#000" : "#000";
        return `<span class="hcell" style="background:${bg};color:${fg}">${(+v).toFixed(1)}%</span>`;
      }
      function predCell(v, dec = 2, xhrGap = null) {
        if (v == null || v === undefined)
          return '<span class="na-cell">—</span>';
        const n = +v;
        const t = tier(dec === 1 ? n * 0.028 : n);
        let color;
        if (dec === 1) {
          color =
            n >= 70
              ? "#145a32"
              : n >= 50
                ? "#00c853"
                : n >= 30
                  ? "#c9a800"
                  : n >= 10
                    ? "#cb4335"
                    : "#a93226";
        } else {
          color = t.bg;
        }
        // More opaque + brighter for greens so they're distinct from dark reds
        let bgOpacity = "22",
          textColor = color;
        if (color === "#00c853") {
          bgOpacity = "44";
          textColor = "#4dff8a";
        }
        if (color === "#145a32") {
          bgOpacity = "55";
          textColor = "#00e676";
        }
        let gapHtml = "";
        if (xhrGap != null && xhrGap >= 0.5) {
          gapHtml = `<div style="font-size:7px;color:#00c853;line-height:1;margin-top:-1px">+${xhrGap.toFixed(1)} due</div>`;
        } else if (xhrGap != null && xhrGap <= -0.5) {
          gapHtml = `<div style="font-size:7px;color:#f85149;line-height:1;margin-top:-1px">${xhrGap.toFixed(1)} over</div>`;
        }
        const h = gapHtml ? 38 : 38;
        return `<span style="display:block;width:100%;min-height:38px;padding:${gapHtml ? '4px 0 2px' : '0'};line-height:${gapHtml ? '20px' : '36px'};text-align:center;font-weight:700;font-size:13px;border:1px solid ${color};color:${textColor};background:${color}${bgOpacity};box-sizing:border-box">${n.toFixed(dec)}${dec === 1 ? "%" : ""}${gapHtml}</span>`;
      }
      function tc(v) {
        return v > 0.3 ? "trend-up" : v < -0.3 ? "trend-dn" : "trend-fl";
      }
      // Matchup-adjusted metric via odds ratio: (batter × pitcher) / league avg
      // If pitcher data missing, use league avg (adjusted = raw batter stat)
      const LG_AVG = {barrel:7.0, hh:38.0, xslg:0.390, xwoba:0.310, xwobacon:0.350, whiff:25.0, ev:88.5, sweet:33.0, fb:35.0};
      function adjMetric(batter, pitcher, lg) {
        if (batter == null || !lg) return null;
        const p = pitcher != null ? pitcher : lg;
        return Math.round(((batter * p) / lg) * 100) / 100;
      }
      function adjCell(val, lg, isDecimal, inverse) {
        if (val == null) return '<span style="color:rgba(255,255,255,0.1)">—</span>';
        const txt = isDecimal ? val.toFixed(3) : val.toFixed(1);
        const ratio = inverse ? lg / val : val / lg;
        let bg, fg;
        if (ratio >= 1.3) { bg = "#145a32"; fg = "#fff"; }
        else if (ratio >= 1.15) { bg = "#00c853"; fg = "#fff"; }
        else if (ratio >= 1.05) { bg = "#c9a800"; fg = "#000"; }
        else if (ratio >= 0.95) { bg = "#cb4335"; fg = "#000"; }
        else { bg = "#a93226"; fg = "#000"; }
        return `<span class="hcell" style="background:${bg};color:${fg}">${txt}</span>`;
      }
      function ts(v) {
        return v > 0.3
          ? `↑ +${v.toFixed(2)}`
          : v < -0.3
            ? `↓ ${v.toFixed(2)}`
            : `→ ${v.toFixed(2)}`;
      }
      function bloodTier(p) {
        const sp = p.sp_tier || "",
          bp = p.bp_tier || "",
          wm = p.wind_mult || 1.0;
        if (sp === "BLEEDING" && bp === "BLEEDING" && wm >= 1.1)
          return "gascan";
        if (sp === "BLEEDING" && bp === "BLEEDING") return "dbl";
        if (sp === "VULNERABLE" && bp === "VULNERABLE") return "both_vuln";
        return null;
      }
      function bpIcon(p) {
        if (bloodTier(p)) return ""; // combined icon shown in SP column
        const t = p.bp_tier || "";
        if (t === "ELITE") return '<span title="Elite BP">⭐⭐</span>';
        if (t === "ACE") return '<span title="Strong BP">⭐</span>';
        if (t === "VULNERABLE") return '<span title="Weak BP">🩸</span>';
        if (t === "BLEEDING") return '<span title="V.Weak BP">🩸🩸</span>';
        return "";
      }
      function muCell(p) {
        const v = p.matchup_score;
        if (v == null) return '<span style="color:var(--muted)">—</span>';
        let bg, fg = "#000";
        if (v >= 70) { bg = "#00c853"; fg = "#fff"; }
        else if (v >= 55) { bg = "#c9a800"; fg = "#fff"; }
        else if (v >= 40) { bg = "#cb4335"; }
        else { bg = "#a93226"; }
        let tip = "";
        if (p.bvp_pa >= 1 && p.bvp_ab > 0) {
          const avg = (p.bvp_h / p.bvp_ab).toFixed(3).replace(/^0/,"");
          tip += `Career vs SP: ${p.bvp_ab} AB, ${p.bvp_h} H, ${p.bvp_hr} HR, ${avg} AVG, ${p.bvp_ops.toFixed(3)} OPS`;
        }
        // Matchup-adjusted metrics
        const parts = [];
        const mHH = adjMetric(p.hard_hit_pct, p.p_hard_hit_pct, LG_AVG.hh);
        const mBrl = adjMetric(p.blast_rate, p.p_barrel_rate, LG_AVG.barrel);
        const mFB = adjMetric(p.flyball_pct, p.p_flyball_pct, LG_AVG.fb);
        const mXslg = adjMetric(p.xslg, p.p_xslg, LG_AVG.xslg);
        const mWhiff = adjMetric(p.whiff_pct, p.p_whiff, LG_AVG.whiff);
        if (mHH != null) parts.push(`HH ${mHH.toFixed(1)}%`);
        if (mBrl != null) parts.push(`Brl ${mBrl.toFixed(1)}%`);
        if (mFB != null) parts.push(`FB ${mFB.toFixed(1)}%`);
        if (mXslg != null) parts.push(`xSLG ${mXslg.toFixed(3)}`);
        if (mWhiff != null) parts.push(`Whiff ${mWhiff.toFixed(1)}%`);
        if (p.xhr_gap != null) parts.push(`xHR gap: ${p.xhr_gap > 0 ? "+" : ""}${p.xhr_gap}`);
        if (p.is_danger) parts.push("☄️ HR BLAST");
        if (parts.length) tip += (tip ? "\n" : "") + parts.join(" · ");
        if (p.p_vuln_score != null) tip += `\nPitcher Vuln: ${(p.p_vuln_score*100).toFixed(0)}% (${p.p_weak_spot})`;
        if (!tip) tip = "No matchup data";
        return `<span style="background:${bg};color:${fg};padding:1px 5px;border-radius:3px;font-size:11px;font-weight:700" title="${tip}">${Math.round(v)}</span>`;
      }
      function pickCell(p) {
        const v = p.pick_score;
        if (v == null) return '<span style="color:var(--muted)">—</span>';
        let bg, fg = "#000";
        if (v >= 70) { bg = "#00c853"; fg = "#fff"; }
        else if (v >= 55) { bg = "#c9a800"; fg = "#fff"; }
        else if (v >= 40) { bg = "#b03a2e"; }
        else { bg = "#7b241c"; }
        return `<span style="background:${bg};color:${fg};padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700">${Math.round(v)}</span>`;
      }
      function tierIcon(p) {
        const bt = bloodTier(p);
        const vuln = p.p_vuln_score;
        const vulnTip = vuln != null ? ` · Vuln: ${(vuln*100).toFixed(0)}%` : "";
        const vulnBadge = vuln != null ? `<span style="font-size:8px;color:${vuln >= 0.55 ? '#f85149' : vuln <= 0.35 ? '#58a6ff' : '#555'};display:block" title="Pitcher vulnerability ${(vuln*100).toFixed(0)}%">${(vuln*100).toFixed(0)}%</span>` : "";
        if (bt === "gascan")
          return `<span title="Both 🩸🩸+ Wind OUT${vulnTip}">🩸⛽</span>${vulnBadge}`;
        if (bt === "dbl")
          return `<span title="Both 🩸🩸${vulnTip}">🩸🩸</span>${vulnBadge}`;
        if (bt === "both_vuln")
          return `<span title="Both 🩸${vulnTip}">🩸</span>${vulnBadge}`;
        const t = p.sp_tier || "";
        if (t === "ELITE") return `<span title="Elite${vulnTip}">⭐⭐</span>${vulnBadge}`;
        if (t === "ACE") return `<span title="Ace${vulnTip}">⭐</span>${vulnBadge}`;
        if (t === "VULNERABLE") return `<span title="Weak SP${vulnTip}">🩸</span>${vulnBadge}`;
        if (t === "BLEEDING") return `<span title="V.Weak SP${vulnTip}">🩸🩸</span>${vulnBadge}`;
        return vulnBadge;
      }
      function logoImg(p) {
        if (!p.team_id) return '<span class="logo-err"></span>';
        const luBadge = p.lineup_confirmed && p.lineup_order ? `<span style="position:absolute;top:-4px;right:-6px;width:14px;height:14px;border-radius:50%;background:#161b22;border:1px solid #39d353;color:#39d353;font-size:9px;font-weight:600;display:flex;align-items:center;justify-content:center;line-height:1">${p.lineup_order}</span>` : "";
        return `<span style="position:relative;display:inline-block;width:20px;height:20px"><img class="logo-img" src="https://www.mlbstatic.com/team-logos/${p.team_id}.svg" onerror="this.outerHTML='<span class=\\'logo-err\\'></span>'">${luBadge}</span>`;
      }
      function drawSpark(canvas, log) {
        const ctx = canvas.getContext("2d");
        const W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        if (!log || !log.length) return;
        const max = Math.max(...log, 5),
          n = log.length,
          gap = 2,
          px = 2,
          py = 5;
        const bw = Math.floor((W - px * 2 - gap * (n - 1)) / n),
          ph = H - py * 2;
        const refY = py + ph - Math.round((2 / max) * ph);
        log.forEach((v, i) => {
          const x = px + i * (bw + gap),
            bh = Math.max(2, Math.round((v / max) * ph));
          const t = tier(v);
          ctx.fillStyle = t.bg;
          ctx.fillRect(x, py + ph - bh, bw, bh);
        });
        ctx.save();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.moveTo(px, refY);
        ctx.lineTo(W - px, refY);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.font = "bold 8px monospace";
        ctx.fillText("2", W - 10, refY - 2);
      }
      let upcomingOnly = false;
      let hideLive = false;
      let primeOnly = false;

      function toggleUpcoming() {
        upcomingOnly = !upcomingOnly;
        const btn = document.getElementById("btn-upcoming");
        btn.className = "btn " + (upcomingOnly ? "slate-on" : "");
        render();
      }

      function togglePrime() {
        primeOnly = !primeOnly;
        if (primeOnly) primePlusOnly = false;
        const btn = document.getElementById("btn-prime");
        btn.className = "btn " + (primeOnly ? "slate-on" : "");
        if (primeOnly) btn.style.color = "#0d1117";
        else btn.style.color = "#ffd700";
        const btn2 = document.getElementById("btn-prime-plus");
        if (btn2) { btn2.className = "btn"; btn2.style.color = "#ff6b35"; }
        render();
      }

      let primePlusOnly = false;
      function togglePrimePlus() {
        primePlusOnly = !primePlusOnly;
        if (primePlusOnly) primeOnly = false;
        const btn = document.getElementById("btn-prime-plus");
        btn.className = "btn " + (primePlusOnly ? "slate-on" : "");
        if (primePlusOnly) btn.style.color = "#0d1117";
        else btn.style.color = "#ff6b35";
        const btn1 = document.getElementById("btn-prime");
        if (btn1) { btn1.className = "btn"; btn1.style.color = "#ffd700"; }
        render();
      }

      // ── Accuracy Panel ──
      let accPanelOpen = false;

      function toggleAccPanel() {
        accPanelOpen = !accPanelOpen;
        document
          .getElementById("acc-panel-body")
          .classList.toggle("open", accPanelOpen);
        document.getElementById("acc-toggle-icon").textContent = accPanelOpen
          ? "▲ COLLAPSE"
          : "▼ EXPAND";
      }

      function barColor(pct) {
        if (pct >= 75) return "#00c853";
        if (pct >= 65) return "#39d353";
        if (pct >= 58) return "#58d68d";
        if (pct >= 52) return "#e3b341";
        if (pct >= 45) return "#d68f00";
        if (pct >= 35) return "#e67e22";
        return "#f85149";
      }

      function wlStr(obj) {
        if (!obj || obj.total === 0) return '<span style="color:#444">—</span>';
        const col = barColor(Math.round((100 * obj.w) / obj.total));
        return `<span style="color:${col}">${obj.w}W-${obj.l}L</span>`;
      }

      function pctBar(h, t, label, sublabel) {
        if (t === 0)
          return `<div class="acc-bar-row"><span class="acc-bar-label">${label}</span><span class="acc-bar-n" style="color:#333">—</span></div>`;
        const p = Math.round((100 * h) / t);
        return `<div class="acc-bar-row">
          <span class="acc-bar-label">${label}</span>
          <div class="acc-bar-track"><div class="acc-bar-fill" style="width:${p}%;background:${barColor(p)}"></div></div>
          <span class="acc-bar-val">${p}%</span>
          <span class="acc-bar-n">${sublabel || h + "/" + t}</span>
        </div>`;
      }

      function switchAccTab(tab) {
        document
          .querySelectorAll(".acc-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".acc-tab-pane")
          .forEach((p) => p.classList.remove("active"));
        document
          .querySelector(`.acc-tab[onclick="switchAccTab('${tab}')"]`)
          .classList.add("active");
        document.getElementById("acc-pane-" + tab).classList.add("active");
      }

      function windowRow(label, w) {
        if (!w || w.total === 0)
          return `<div class="acc-bar-row"><span class="acc-bar-label">${label}</span><span class="acc-bar-n" style="color:#333">—</span></div>`;
        const p = w.accuracy;
        return `<div class="acc-bar-row">
          <span class="acc-bar-label">${label}</span>
          <div class="acc-bar-track"><div class="acc-bar-fill" style="width:${p}%;background:${barColor(p)}"></div></div>
          <span class="acc-bar-val">${p}%</span>
          <span class="acc-bar-n">${w.hits}/${w.total}</span>
        </div>`;
      }

      function buildTop10Col(elId, wdata) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (!wdata) {
          el.innerHTML = '<div style="color:#333;font-size:9px">no data</div>';
          return;
        }
        el.innerHTML =
          windowRow("Yesterday", wdata.yesterday) +
          windowRow("Last 5", wdata.last5) +
          windowRow("All Time", wdata.alltime);
      }

      function buildBloodCol(elId, picks) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (!picks || picks.length === 0) {
          el.innerHTML =
            '<div style="color:#333;font-size:9px">no data yet</div>';
          return;
        }
        const W = picks.filter((p) => p.windowed);
        el.innerHTML =
          windowRow("Yesterday", picks.yesterday) +
          windowRow("Last 5", picks.last5) +
          windowRow("Last 10", picks.last10) +
          windowRow("Last 30", picks.last30);
      }

      function approxMU(p) {
        if (p.matchup_score != null) return p.matchup_score;
        const spMap = {BLEEDING:50,VULNERABLE:40,AVERAGE:30,ACE:20,ELITE:10};
        const bpMap = {BLEEDING:24,VULNERABLE:18,AVERAGE:10,ACE:5,ELITE:2};
        const sp = spMap[p.sp_tier] || 30;
        const bp = bpMap[p.bp_tier] || 10;
        const wm = p.wind_mult || 1.0;
        const wind = Math.max(0, Math.min(10, (wm - 1.0) / 0.2 * 10));
        return Math.round(sp + bp + wind);
      }
      function buildMUWindowed(elId, graded, lo, hi) {
        const el = document.getElementById(elId);
        if (!el) return;
        function _w(cutoff) {
          const rows = graded.filter(
            (p) => {
              const mu = approxMU(p);
              return mu >= lo && mu < hi &&
                (!cutoff || p.date >= cutoff) &&
                p.hit !== null && p.hit !== undefined;
            }
          );
          const h = rows.filter((p) => p.hit).length;
          return {
            total: rows.length, hits: h,
            accuracy: rows.length ? Math.round((100 * h) / rows.length) : 0,
          };
        }
        const today = new Date();
        const d = (n) => {
          const x = new Date(today);
          x.setDate(x.getDate() - n);
          return x.toISOString().slice(0, 10);
        };
        el.innerHTML =
          windowRow("Yesterday", _w(d(1))) +
          windowRow("Last 5", _w(d(5))) +
          windowRow("All Time", _w(null));
      }

      function rebuildAccPanel() {
        const A = PRED_ACCURACY;
        const graded = A.graded || [];
        const W = A.windowed || {};

        // Header
        const total = A.total || 0;
        const pct = A.accuracy || 0;
        document.getElementById("acc-header-summary").textContent = total
          ? `· ${A.hits}/${total} (${pct}%) · last graded ${A.last_graded}`
          : "· no graded predictions yet";

        // ── MU tab ──
        function buildMUCard(elId, label, graded, lo, hi) {
          const el = document.getElementById(elId);
          if (!el) return;
          el.style.cssText = "background:#0d1117;border:1px solid #1e1e1e;border-radius:8px;padding:12px 14px;text-align:center";
          function _w(cutoff) {
            const rows = graded.filter(p => {
              const mu = approxMU(p);
              return mu >= lo && mu < hi && (!cutoff || p.date >= cutoff) && p.hit !== null && p.hit !== undefined;
            });
            const h = rows.filter(p => p.hit).length;
            return { total: rows.length, hits: h, accuracy: rows.length ? Math.round(100*h/rows.length) : 0 };
          }
          const today = new Date();
          const d = (n) => { const x = new Date(today); x.setDate(x.getDate()-n); return x.toISOString().slice(0,10); };
          const allTime = _w(null);
          const yest = _w(d(1));
          const last5 = _w(d(5));
          const pctColor = (p) => p >= 1 ? barColor(p) : "#555";
          el.innerHTML = `<div style="font-size:13px;color:#8b949e;margin-bottom:6px;font-weight:600;letter-spacing:.04em">${label}</div>
            <div style="font-size:28px;font-weight:700;font-family:'Barlow Condensed',sans-serif;margin-bottom:2px;color:${pctColor(allTime.accuracy)}">${allTime.total ? allTime.accuracy + "%" : "—"}</div>
            <div style="font-size:12px;color:#555;margin-bottom:8px">${allTime.total ? allTime.hits + "/" + allTime.total : "no data"}</div>
            <div style="border-top:1px solid #1e1e1e;margin-bottom:6px"></div>
            <div style="display:grid;grid-template-columns:1fr auto auto;gap:0 6px;font-size:11px">
              <span style="color:#555;text-align:left;padding:2px 0">Yesterday</span><span style="text-align:right;font-weight:600;padding:2px 0;color:${yest.total ? pctColor(yest.accuracy) : '#555'}">${yest.total ? yest.accuracy+"%" : "—"}</span><span style="color:#555;text-align:right;padding:2px 0">${yest.total ? yest.hits+"/"+yest.total : ""}</span>
              <span style="color:#555;text-align:left;padding:2px 0">Last 5</span><span style="text-align:right;font-weight:600;padding:2px 0;color:${last5.total ? pctColor(last5.accuracy) : '#555'}">${last5.total ? last5.accuracy+"%" : "—"}</span><span style="color:#555;text-align:right;padding:2px 0">${last5.total ? last5.hits+"/"+last5.total : ""}</span>
            </div>`;
        }
        buildMUCard("acc-mu-80", "MU 80+", graded, 80, 999);
        buildMUCard("acc-mu-70", "MU 70-79", graded, 70, 80);
        buildMUCard("acc-mu-55", "MU 55-69", graded, 55, 70);
        buildMUCard("acc-mu-40", "MU 40-54", graded, 40, 55);
        buildMUCard("acc-mu-0",  "MU <40",   graded, 0, 40);

        // Top 10 E-HRR by MU bucket
        const allTopHrr = (A.daily_picks || []).flatMap(d => (d.top_hrr || []).filter(p => p.graded && p.hit_hrr !== null));
        const muLabels = [{l:"80+",lo:80,hi:999},{l:"70-79",lo:70,hi:80},{l:"55-69",lo:55,hi:70},{l:"40-54",lo:40,hi:55},{l:"<40",lo:0,hi:40}];
        const ehrEl = document.getElementById("acc-ehrr-by-mu");
        if (ehrEl) {
          const pctColor2 = barColor;
          ehrEl.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${muLabels.map(b => {
            const rows = allTopHrr.filter(p => { const mu = approxMU(p); return mu >= b.lo && mu < b.hi; });
            if (!rows.length) return `<div style="background:#0d1117;border:1px solid #1e1e1e;border-radius:6px;padding:8px 14px;text-align:center;flex:1;min-width:90px">
              <div style="font-size:11px;color:#555;margin-bottom:4px">MU ${b.l}</div>
              <div style="font-size:14px;color:#555">—</div>
            </div>`;
            const h = rows.filter(p => p.hit_hrr).length;
            const pct = Math.round(100*h/rows.length);
            return `<div style="background:#0d1117;border:1px solid #1e1e1e;border-radius:6px;padding:8px 14px;text-align:center;flex:1;min-width:90px">
              <div style="font-size:11px;color:#8b949e;margin-bottom:4px">MU ${b.l}</div>
              <div style="font-size:20px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${pctColor2(pct)}">${pct}%</div>
              <div style="font-size:10px;color:#555">${h}/${rows.length}</div>
            </div>`;
          }).join("")}</div>`;
        }

        // ── Top 10s tab ──
        buildTop10Col("acc-t10-hrr", W.hrr);
        buildTop10Col("acc-t10-bases", W.bases);
        buildTop10Col("acc-t10-hr", W.hr);
        buildTop10Col("acc-t10-pick", W.pick);

        // ── Ranks tab ──
        const rk = A.ranks || {};
        document.getElementById("acc-ranks").innerHTML = [1, 2, 3]
          .map((r) => {
            const s = rk[r] || { w: 0, l: 0, total: 0 };
            const pct2 = s.total ? Math.round((100 * s.w) / s.total) : null;
            const col = pct2 != null ? barColor(pct2) : "#444";
            return `<div style="flex:1;text-align:center;padding:8px 4px;border:1px solid #1e1e1e;border-radius:4px;background:#0d1117">
            <div style="font-size:9px;color:#555;letter-spacing:.06em;margin-bottom:4px">RANK #${r}</div>
            <div style="font-size:18px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${col}">${s.total ? s.w + "W-" + s.l + "L" : "—"}</div>
            <div style="font-size:8px;color:#444;margin-top:2px">${pct2 != null ? pct2 + "%" : "no data"}</div>
          </div>`;
          })
          .join("");

        // ── Games tab ──
        const TEAM_ABBR = {"108":"LAA","109":"ARI","110":"BAL","111":"BOS","112":"CHC","113":"CIN","114":"CLE","115":"COL","116":"DET","117":"HOU","118":"KC","119":"LAD","120":"WSH","121":"NYM","133":"OAK","134":"PIT","135":"SD","136":"SEA","137":"SF","138":"STL","139":"TB","140":"TEX","141":"TOR","142":"MIN","143":"PHI","144":"ATL","145":"CWS","146":"MIA","147":"NYY","158":"MIL"};
        function teamName(g, side) { return g[side] && isNaN(g[side]) ? g[side] : TEAM_ABBR[g[side+"_id"]] || g[side+"_id"] || "?"; }
        const gp = A.game_preds || {};
        const lean = gp.lean || {w:0,l:0,total:0};
        const leanPct = lean.total ? Math.round(100*lean.w/lean.total) : null;
        const leanEl = document.getElementById("acc-games-record");
        if (leanEl) {
          leanEl.innerHTML = lean.total
            ? `<div style="font-size:22px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${barColor(leanPct)}">${lean.w}W-${lean.l}L</div><div style="font-size:10px;color:#555">${leanPct}% · ${lean.total} games</div>`
            : '<div style="color:#555;font-size:10px">no data yet</div>';
        }
        // Confidence breakdown
        const bc = gp.by_confidence || {};
        [["vstrong","acc-games-vstrong"],["strong2","acc-games-strong2"],["solid","acc-games-solid"],["moderate","acc-games-moderate"],["lean","acc-games-lean"],["tossup","acc-games-tossup"]].forEach(([tier,elId]) => {
          const el = document.getElementById(elId);
          if (!el) return;
          // Compute from recent data since grade.py uses different bucket names
          const recent = gp.recent || [];
          let lo, hi;
          if (tier === "vstrong") { lo = 40; hi = 999; }
          else if (tier === "strong2") { lo = 25; hi = 40; }
          else if (tier === "solid") { lo = 15; hi = 25; }
          else if (tier === "moderate") { lo = 10; hi = 15; }
          else if (tier === "lean") { lo = 5; hi = 10; }
          else { lo = 0; hi = 5; }
          const filtered = recent.filter(g => (g.edge_pct||0) >= lo && (g.edge_pct||0) < hi && g.lean_correct !== null);
          const w = filtered.filter(g => g.lean_correct).length;
          const l = filtered.length - w;
          const tot = w + l;
          const pct2 = tot ? Math.round(100*w/tot) : null;
          el.innerHTML = tot
            ? `<div style="font-size:18px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${barColor(pct2)}">${w}W-${l}L</div><div style="font-size:10px;color:#555">${pct2}%</div>`
            : '<div style="color:#555;font-size:10px">—</div>';
        });
        // PRIME: E-HRR >= 2.0 AND MU >= 60 hit rate
        const primeEl = document.getElementById("acc-games-prime");
        if (primeEl) {
          const primeGraded = graded.filter(p => (p.e_hrr||0) >= 2.0 && (p.matchup_score||0) >= 60 && p.hit !== null && p.hit !== undefined);
          if (primeGraded.length) {
            const primeW = primeGraded.filter(p => p.hit).length;
            const primeL = primeGraded.length - primeW;
            const primePct = Math.round(100*primeW/primeGraded.length);
            primeEl.innerHTML = `<div style="font-size:22px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${barColor(primePct)}">${primeW}-${primeL}</div><div style="font-size:10px;color:#555">${primePct}% · ${primeGraded.length} picks</div>`;
          } else {
            primeEl.innerHTML = '<div style="color:#555;font-size:10px">starts today</div>';
          }
        }
        // PRIME+ accuracy: PRIME + BLEEDING SP
        const primePlusEl = document.getElementById("acc-games-primeplus");
        if (primePlusEl) {
          const ppGraded = graded.filter(p => (p.e_hrr||0) >= 2.3 && (p.matchup_score||0) >= 65 && p.hit !== null && p.hit !== undefined);
          if (ppGraded.length) {
            const ppW = ppGraded.filter(p => p.hit).length;
            const ppL = ppGraded.length - ppW;
            const ppPct = Math.round(100*ppW/ppGraded.length);
            primePlusEl.innerHTML = `<div style="font-size:22px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${barColor(ppPct)}">${ppW}-${ppL}</div><div style="font-size:10px;color:#555">${ppPct}% · ${ppGraded.length} picks</div>`;
          } else {
            primePlusEl.innerHTML = '<div style="color:#555;font-size:10px">starts today</div>';
          }
        }
        // Overs: actual >= est_runs = W, actual < est_runs = L
        const oversEl = document.getElementById("acc-games-overs");
        const undersEl = document.getElementById("acc-games-unders");
        if (oversEl && undersEl) {
          const ouGames = (gp.recent || []).filter(g => g.est_runs && g.actual_runs != null);
          if (ouGames.length) {
            const overW = ouGames.filter(g => g.actual_runs >= g.est_runs).length;
            const overL = ouGames.length - overW;
            const underW = ouGames.filter(g => g.actual_runs <= g.est_runs).length;
            const underL = ouGames.length - underW;
            const overPct = Math.round(100*overW/ouGames.length);
            const underPct = Math.round(100*underW/ouGames.length);
            const overColor = barColor(overPct);
            const underColor = barColor(underPct);
            oversEl.innerHTML = `<div style="font-size:22px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${overColor}">${overW}-${overL}</div><div style="font-size:10px;color:#555">${overPct}%</div>`;
            undersEl.innerHTML = `<div style="font-size:22px;font-weight:700;font-family:'Barlow Condensed',sans-serif;color:${underColor}">${underW}-${underL}</div><div style="font-size:10px;color:#555">${underPct}%</div>`;
          } else {
            oversEl.innerHTML = '<div style="color:#555;font-size:10px">starts today</div>';
            undersEl.innerHTML = '<div style="color:#555;font-size:10px">starts today</div>';
          }
        }
        const recentEl = document.getElementById("acc-games-recent");
        if (recentEl) {
          const all = (gp.recent || []);
          // Group by date
          const byDate = {};
          for (const g of all) {
            const d = g.date || "?";
            if (!byDate[d]) byDate[d] = [];
            byDate[d].push(g);
          }
          const dates = Object.keys(byDate).sort().reverse();
          if (dates.length) {
            recentEl.innerHTML = `<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr 1fr 1fr 1fr 60px;gap:4px;font-size:10px;margin-bottom:4px">
              <span style="color:#555">Date</span><span style="color:#555">V.Strong (40%+)</span><span style="color:#555">Strong (25-40%)</span><span style="color:#555">Solid (15-25%)</span><span style="color:#555">Moderate (10-15%)</span><span style="color:#555">Lean (5-10%)</span><span style="color:#555">Toss-up (&lt;5%)</span><span style="color:#555">Total</span>
            </div>` + dates.map(d => {
              const games = byDate[d];
              function bucket(lo, hi) {
                const b = games.filter(g => (g.edge_pct||0) >= lo && (g.edge_pct||0) < hi && g.lean_correct !== null);
                const w = b.filter(g => g.lean_correct).length;
                const l = b.length - w;
                if (!b.length) return '<span style="color:#333">—</span>';
                const pct = Math.round(100*w/b.length);
                return `<span style="color:${barColor(pct)}">${w}W-${l}L</span>`;
              }
              const totalW = games.filter(g => g.lean_correct === true).length;
              const totalL = games.filter(g => g.lean_correct === false).length;
              return `<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr 1fr 1fr 1fr 60px;gap:4px;padding:3px 0;border-bottom:1px solid #1a1a1a;font-size:10px">
                <span style="color:#8b949e">${d}</span>
                ${bucket(40, 999)}
                ${bucket(25, 40)}
                ${bucket(15, 25)}
                ${bucket(10, 15)}
                ${bucket(5, 10)}
                ${bucket(0, 5)}
                <span style="color:#8b949e">${totalW}W-${totalL}L</span>
              </div>`;
            }).join("");
          } else {
            recentEl.innerHTML = '<div style="color:#555;font-size:10px">no graded games yet</div>';
          }
        }

        // ── Carnage tab ──
        const carnageEl = document.getElementById("acc-carnage-log");
        const carnageData = A.sp_carnage || [];
        if (carnageEl) {
          if (carnageData.length) {
            carnageEl.innerHTML = carnageData.slice(0, 30).map(c => {
              return `<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #1a1a1a;font-size:11px">
                <span>🔥</span>
                <span style="min-width:140px;font-weight:500;color:#e6edf3">${c.name || "?"}</span>
                <span style="color:#f85149">${c.ip || "?"} IP  ${c.er || "?"} ER  ${c.h || "?"} H  ${c.hr || "?"} HR</span>
                <span style="color:#555">vs ${c.opponent || "?"}</span>
                <span style="color:#484f58;margin-left:auto">${c.date || ""}</span>
              </div>`;
            }).join("");
          } else {
            carnageEl.innerHTML = '<div style="color:#555;font-size:10px">no carnage data yet</div>';
          }
        }

        // ── Log tab ──
        const logEl = document.getElementById("acc-log");
        if (!graded.length) {
          logEl.innerHTML = '<div class="acc-empty">No graded picks yet</div>';
          return;
        }
        logEl.innerHTML = graded
          .slice(0, 50)
          .map((p) => {
            const cls = p.hit ? "hit" : "miss";
            const dot = p.hit ? "✅" : "❌";
            const _bt = (() => {
              const sp = p.sp_tier || "",
                bp = p.bp_tier || "",
                wm = p.wind_mult || 1.0;
              if (sp === "BLEEDING" && bp === "BLEEDING" && wm >= 1.1)
                return "gascan";
              if (sp === "BLEEDING" && bp === "BLEEDING") return "dbl";
              if (sp === "VULNERABLE" && bp === "VULNERABLE") return "vuln";
              return null;
            })();
            const sp = _bt
              ? ""
              : p.sp_tier
                ? `<span style="font-size:8px;color:#555">${p.sp_tier.slice(0, 4)}</span>`
                : "";
            const bp =
              _bt === "gascan"
                ? `<span style="font-size:10px">🩸⛽</span>`
                : _bt === "dbl"
                  ? `<span style="font-size:10px">🩸🩸</span>`
                  : _bt === "vuln"
                    ? `<span style="font-size:10px">🩸</span>`
                    : p.bp_tier === "BLEEDING"
                      ? `<span style="font-size:8px;color:#c0392b">🩸</span>`
                      : "";
            return `<div class="acc-log-row ${cls}">
            <span class="acc-log-dot">${dot}</span>
            <span class="acc-log-name">${p.name}</span>
            <span style="display:flex;gap:2px;align-items:center">${sp}${bp}</span>
            <span class="acc-log-date">${p.date}</span>
            <span class="acc-log-ehrr">E:${(p.e_hrr || 0).toFixed(2)}</span>
            <span class="acc-log-actual ${cls}">${p.actual != null ? p.actual + " HRR" : "—"}</span>
          </div>`;
          })
          .join("");
      }

      function toggleHideLive() {
        hideLive = !hideLive;
        const btn = document.getElementById("btn-hide-live");
        btn.className = "btn " + (hideLive ? "slate-on" : "");
        render();
      }

      function toggleSlate() {
        slateOnly = !slateOnly;
        const btn = document.getElementById("btn-slate");
        btn.className = "btn " + (slateOnly ? "slate-on" : "");
        btn.textContent = slateOnly ? "🔴 Today's Slate" : "⚪ All Players";
        render();
      }
      function setSort(c) {
        if (col === c) dir *= -1;
        else {
          col = c;
          dir = 1;
        }
        document.querySelectorAll('thead th[id^="h-"]').forEach((th) => {
          th.classList.remove("sorted");
          const k = th.id.replace("h-", "");
          if (k === "best" || k === "avgstreak" || k === "streak" || k === "p1")
            return;
          if (k === col) {
            th.classList.add("sorted");
            th.textContent =
              th.textContent.replace(/[ ▾▴]/g, "").trim() +
              (dir === 1 ? " ▾" : " ▴");
          } else {
            th.textContent = th.textContent.replace(/[ ▾▴]/g, "").trim();
          }
        });
        document
          .querySelectorAll(".btn[data-s]")
          .forEach((b) => b.classList.toggle("active", b.dataset.s === col));
        render();
      }
      const CONT_PROB = {
        1: 43.6,
        2: 45.2,
        3: 47.8,
        4: 49.5,
        5: 48.9,
        6: 49.4,
        7: 52.8,
        8: 54.7,
        9: 51.7,
        10: 55.6,
        11: 56.0,
        12: 69.2,
      };
      const CONT_COUNTS = {
        1: 27829,
        2: 12075,
        3: 5444,
        4: 2591,
        5: 1281,
        6: 627,
        7: 307,
        8: 161,
        9: 87,
        10: 45,
        11: 25,
        12: 13,
      };
      let streakGames = 3,
        streakMin = 2,
        streakFilter = false,
        streakHide = false;
      const highlighted = new Set();

      let parlayTrayOpen = false;

      function toggleHighlight(e, pid) {
        if (e.target.closest("canvas,button,input,select,a")) return;
        if (highlighted.has(pid)) highlighted.delete(pid);
        else highlighted.add(pid);
        document.querySelectorAll("tbody tr").forEach((tr) => {
          const onClickAttr = tr.getAttribute("onclick") || "";
          if (onClickAttr.includes(pid)) {
            tr.classList.toggle("row-highlight", highlighted.has(pid));
          }
        });
        updateParlayTray();
      }

      function clearHighlights() {
        highlighted.clear();
        document
          .querySelectorAll("tbody tr")
          .forEach((tr) => tr.classList.remove("row-highlight"));
        updateParlayTray();
      }

      function toggleParlayTray() {
        parlayTrayOpen = !parlayTrayOpen;
        document
          .getElementById("parlay-tray")
          .classList.toggle("open", parlayTrayOpen);
      }

      const parlayOdds = {}; // pid -> American odds string e.g. "-115" or "+120"

      function americanToDecimal(str) {
        const v = parseInt(str);
        if (isNaN(v)) return null;
        return v > 0 ? v / 100 + 1 : 100 / Math.abs(v) + 1;
      }

      function updatePayout() {
        const pids = [...highlighted];
        let mult = 1;
        let allSet = pids.length > 0;
        for (const pid of pids) {
          const dec = americanToDecimal(parlayOdds[pid]);
          if (dec === null) {
            allSet = false;
            break;
          }
          mult *= dec;
        }
        const payoutEl = document.getElementById("parlay-payout");
        const valEl = document.getElementById("pp-val");
        if (allSet && pids.length > 1) {
          const profit = ((mult - 1) * 100).toFixed(2);
          valEl.textContent = "$" + profit;
          payoutEl.style.display = "flex";
        } else {
          payoutEl.style.display = "none";
        }
      }

      function updateParlayTray() {
        const count = highlighted.size;
        document.getElementById("pt-count").textContent = count;
        const tray = document.getElementById("parlay-tray");
        if (count > 0) {
          tray.classList.add("open");
          parlayTrayOpen = true;
        } else {
          tray.classList.remove("open");
          parlayTrayOpen = false;
        }
        const body = document.getElementById("parlay-tray-body");
        if (count === 0) {
          body.innerHTML = "";
          document.getElementById("parlay-payout").style.display = "none";
          return;
        }
        const rows = [...highlighted]
          .map((pid) => {
            const p = ALL[pid] || SLATE[pid];
            if (!p) return "";
            const name = p.name || pid;
            const p2 = p.e_p2 != null ? Math.round(p.e_p2) + "%" : "—";
            const ehrr = p.e_hrr != null ? p.e_hrr.toFixed(2) : "—";
            const oddsVal = parlayOdds[pid] || "";
            return `<div class="parlay-row">
            <span class="pr-name">${name}</span>
            <span class="pr-line">2+ HRR · E:${ehrr}</span>
            <span class="pr-p2">${p2}</span>
            <input class="pr-odds" type="text" placeholder="-110" value="${oddsVal}"
              oninput="parlayOdds['${pid}']=this.value;updatePayout()"
              onclick="event.stopPropagation()"
            />
            <span class="pr-remove" onclick="removeParlay('${pid}')">✕</span>
          </div>`;
          })
          .join("");
        body.innerHTML = rows;
        updatePayout();
      }

      function removeParlay(pid) {
        highlighted.delete(pid);
        document.querySelectorAll("tbody tr").forEach((tr) => {
          const onClickAttr = tr.getAttribute("onclick") || "";
          if (onClickAttr.includes(pid)) tr.classList.remove("row-highlight");
        });
        updateParlayTray();
      }

      function copyParlay() {
        if (highlighted.size === 0) return;
        const lines = [...highlighted]
          .map((pid) => {
            const p = ALL[pid] || SLATE[pid];
            if (!p) return null;
            const name = p.name || pid;
            const p2 = p.e_p2 != null ? Math.round(p.e_p2) + "%" : "—";
            const ehrr = p.e_hrr != null ? p.e_hrr.toFixed(2) : "—";
            const odds = parlayOdds[pid] ? ` @ ${parlayOdds[pid]}` : "";
            return `${name} - Hits + Runs + RBIs 2+${odds} (E-HRR: ${ehrr}, P2+: ${p2})`;
          })
          .filter(Boolean);
        const header = `=== PARLAY PICKS — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ===`;
        // Payout line
        let payoutLine = "";
        const ppEl = document.getElementById("pp-val");
        if (ppEl && ppEl.textContent !== "—")
          payoutLine = `$100 pays ${ppEl.textContent}`;
        const text = [header, ...lines, payoutLine].filter(Boolean).join("\n");
        navigator.clipboard.writeText(text).then(() => {
          const el = document.getElementById("parlay-copied");
          el.style.display = "block";
          setTimeout(() => (el.style.display = "none"), 2000);
        });
      }

      function avgStreakLen(log, minHrr) {
        // Average length of completed streaks that reached at least 2 games
        if (!log || !log.length) return null;
        const lengths = [];
        let run = 0;
        log.forEach((v) => {
          if (v >= minHrr) {
            run++;
          } else {
            if (run >= 2) lengths.push(run);
            run = 0;
          }
        });
        if (run >= 2) lengths.push(run);
        if (!lengths.length) return null;
        return (
          Math.round(
            (lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10,
          ) / 10
        );
      }

      function avgStreakCell(p) {
        const avg = avgStreakLen(p.log_full || p.log || [], streakMin);
        if (!avg)
          return '<span style="color:rgba(255,255,255,0.1);font-size:10px">—</span>';
        return (
          '<span style="font-family:Barlow Condensed,sans-serif;font-size:13px;font-weight:700;color:#7d8590">' +
          avg +
          "</span>"
        );
      }

      function bestStreak(log, minHrr) {
        if (!log || !log.length) return 0;
        let best = 0,
          run = 0;
        log.forEach((v) => {
          if (v >= minHrr) {
            run++;
            best = Math.max(best, run);
          } else run = 0;
        });
        return best;
      }

      function bestCell(p) {
        const b = bestStreak(p.log_full || p.log || [], streakMin);
        const cur = getStreak(p.log || [], streakMin);
        const logFull = p.log_full || p.log || [];
        if (b <= 0)
          return '<span style="color:rgba(255,255,255,0.1);font-size:10px">—</span>';
        // Gold if currently ON their best streak, gray otherwise
        const onBest = cur >= b && b > 0 && cur > 0;
        const color = onBest ? "#ffd700" : "#7d8590";
        return (
          '<span style="font-family:Barlow Condensed,sans-serif;font-size:14px;font-weight:700;color:' +
          color +
          '">' +
          b +
          "</span>"
        );
      }

      function getStreak(log, minHrr) {
        if (!log || !log.length) return 0;
        let count = 0;
        for (let i = log.length - 1; i >= 0; i--) {
          if (log[i] >= minHrr) count++;
          else break;
        }
        return count;
      }

      function windBadge(p) {
        const m = p.wind_mult || 1.0;
        const spd = Math.round(p.wind_speed || 0);
        if (m >= 1.2)
          return (
            '<span style="margin-left:5px;font-size:9px;font-weight:700;color:#00c853">▲ ' +
            spd +
            "mph</span>"
          );
        if (m >= 1.1)
          return (
            '<span style="margin-left:5px;font-size:9px;font-weight:700;color:#39d353">▲ ' +
            spd +
            "mph</span>"
          );
        if (m <= 0.9)
          return (
            '<span style="margin-left:5px;font-size:9px;font-weight:700;color:#f85149">▼ ' +
            spd +
            "mph</span>"
          );
        if (m <= 0.96)
          return (
            '<span style="margin-left:5px;font-size:9px;font-weight:700;color:#b03a2e">▼ ' +
            spd +
            "mph</span>"
          );
        return "";
      }

      function accBadge(p) {
        const a = p.player_acc;
        if (!a || a.n < 5) return "";
        const bias = a.bias;
        let color, symbol;
        if (Math.abs(bias) <= 0.3) { color = "#00c853"; symbol = "🎯"; }
        else if (bias > 0.3) { color = "#f85149"; symbol = "▲"; }  // overestimates
        else { color = "#58a6ff"; symbol = "▼"; }  // underestimates
        const tip = `Model: ${a.n} picks, pred avg ${a.avg_pred}, actual avg ${a.avg_act}, bias ${bias > 0 ? "+" : ""}${bias}, ${a.hit_pct}% hit 2+`;
        return `<span style="margin-left:4px;font-size:9px;color:${color}" title="${tip}">${symbol}</span>`;
      }
      function streakBadge(p) {
        const s = getStreak(p.log_full || p.log || [], streakMin);
        if (s <= 0)
          return '<span style="color:rgba(255,255,255,0.1);font-size:10px">—</span>';
        const color =
          s >= 7
            ? "#ffd700"
            : s >= 5
              ? "#00c853"
              : s >= 3
                ? "#58a6ff"
                : "#7d8590";
        const icon = s >= 7 ? "🔥" : s >= 5 ? "⚡" : s >= 3 ? "→" : "";
        return (
          '<span style="font-family:Barlow Condensed,sans-serif;font-size:15px;font-weight:700;color:' +
          color +
          '">' +
          icon +
          s +
          "</span>"
        );
      }

      function compositeScore(p) {
        const log = p.log_full || p.log || [];
        const s = getStreak(log, streakMin);
        if (s < 3) return null;
        const ehrr = p.e_hrr || 0;
        if (ehrr < 2.0) return null;

        // SP tier is the foundation
        const sp = p.sp_tier || "";
        let spBase = 0;
        if (sp === "BLEEDING")
          spBase = 65; // 3G+ qualifies
        else if (sp === "VULNERABLE")
          spBase = 55; // 3G+ qualifies
        else if (sp === "AVERAGE" && s >= 7)
          spBase = 48; // 7G+ streak overrides
        else return null;

        // BP tier
        const bp = p.bp_tier || "";
        const bpAdj =
          bp === "BLEEDING"
            ? 6
            : bp === "VULNERABLE"
              ? 3
              : bp === "ACE"
                ? -3
                : bp === "ELITE"
                  ? -6
                  : 0;

        // Streak confirmation
        const streakBonus =
          s >= 12
            ? 8
            : s >= 10
              ? 6
              : s >= 8
                ? 5
                : s >= 7
                  ? 4
                  : s >= 5
                    ? 2
                    : s >= 4
                      ? 1
                      : 0;

        // E-HRR
        const ehrAdj = ehrr >= 3.5 ? 4 : ehrr >= 3.0 ? 3 : ehrr >= 2.5 ? 2 : 1;

        // Trend
        const trend = p.trend || 0;
        const trendAdj =
          trend > 0.5 ? 2 : trend > 0 ? 1 : trend < -0.5 ? -2 : -1;

        // Home/away
        const homeAdj = p.is_home ? 1 : -1;

        // Weather
        const wm = p.wind_mult || 1.0;
        const weatherAdj = wm >= 1.2 ? 1 : wm <= 0.9 ? -1 : 0;

        // Team OBP
        const tobp = p.team_obp || 0.318;
        const obpAdj = tobp >= 0.34 ? 1 : tobp <= 0.3 ? -1 : 0;

        const total =
          spBase +
          bpAdj +
          streakBonus +
          ehrAdj +
          trendAdj +
          homeAdj +
          weatherAdj +
          obpAdj;
        return Math.min(90, Math.max(10, Math.round(total * 10) / 10));
      }

      function p1Score(p) {
        const s = getStreak(p.log || [], streakMin);
        if (s <= 0) return null;

        // Start with historical base rate
        const base = CONT_PROB[s] || 42.0;

        // Hard gate: if model predicts < 2.0 HRR, suppress heavily
        const ehrr = p.e_hrr || 2.0;
        const modelPen =
          ehrr < 1.5 ? 0.55 : ehrr < 1.8 ? 0.72 : ehrr < 2.0 ? 0.88 : 1.0;
        const gated = base * modelPen;

        // Additive adjustments (each capped at small range to prevent explosion)
        // SP tier: -8 to +8 pts
        const spAdj =
          p.sp_tier === "ELITE"
            ? -8
            : p.sp_tier === "ACE"
              ? -4
              : p.sp_tier === "VULNERABLE"
                ? +5
                : p.sp_tier === "BLEEDING"
                  ? +8
                  : 0;

        // BP tier: -5 to +5 pts
        const bpAdj =
          p.bp_tier === "BLEEDING"
            ? +5
            : p.bp_tier === "VULNERABLE"
              ? +3
              : p.bp_tier === "ACE"
                ? -3
                : p.bp_tier === "ELITE"
                  ? -5
                  : 0;

        // E-HRR quality boost: 0 to +8 pts
        const ehrAdj =
          ehrr >= 3.5
            ? +8
            : ehrr >= 3.0
              ? +5
              : ehrr >= 2.5
                ? +3
                : ehrr >= 2.0
                  ? +1
                  : 0;

        // Trend: -4 to +4 pts
        const trend = p.trend || 0;
        const trendAdj =
          trend > 0.5
            ? +4
            : trend > 0
              ? +2
              : trend < -0.5
                ? -4
                : trend < 0
                  ? -2
                  : 0;

        // Home/away: +2/-2 pts
        const homeAdj = p.is_home ? +2 : -2;

        // Weather: -4 to +4 pts
        const wm = p.wind_mult || 1.0;
        const weatherAdj =
          wm >= 1.2
            ? +2
            : wm >= 1.1
              ? +1
              : wm <= 0.9
                ? -2
                : wm <= 0.96
                  ? -1
                  : 0;

        // Lineup position: -4 to +3 pts
        const pos = p.lineup_order || null;
        const lineupAdj =
          pos === 3
            ? +3
            : pos === 4
              ? +2
              : pos === 2
                ? +2
                : pos === 1
                  ? +1
                  : pos === 5
                    ? 0
                    : pos === 6
                      ? -1
                      : pos === 7
                        ? -2
                        : pos === 8
                          ? -3
                          : pos === 9
                            ? -4
                            : 0;

        // Team OBP: -2 to +2 pts
        const tObp = p.team_obp || 0.318;
        const obpAdj = Math.round((tObp - 0.318) * 50); // ~+/-2 pts

        const total =
          gated +
          spAdj +
          bpAdj +
          ehrAdj +
          trendAdj +
          homeAdj +
          weatherAdj +
          lineupAdj +
          obpAdj;
        return Math.min(80, Math.max(5, Math.round(total)));
      }

      function p1Cell(p) {
        // Use compositeScore if player qualifies (3G+ streak, E-HRR >= 1.8)
        // Fall back to p1Score for others
        const score = compositeScore(p);
        if (score === null)
          return '<span style="color:rgba(255,255,255,0.1);font-size:10px">—</span>';
        const s = getStreak(p.log_full || p.log || [], streakMin);
        // Color by tier: gold=7G+, green=5-6G, blue=3-4G, gray=other
        const color =
          s >= 7
            ? "#ffd700"
            : s >= 5
              ? "#00c853"
              : s >= 3
                ? "#58a6ff"
                : "#7d8590";
        const qual = compositeScore(p) !== null;
        const border = qual
          ? "border:1px solid " + color + ";"
          : "border:1px solid #30363d;";
        return (
          '<span style="font-family:Barlow Condensed,sans-serif;font-size:14px;font-weight:700;color:' +
          color +
          ";" +
          border +
          "background:" +
          color +
          '18;display:block;width:100%;height:38px;line-height:36px;text-align:center">' +
          score +
          "%</span>"
        );
      }

      function adjStreak(type, delta) {
        if (type === "g")
          streakGames = Math.max(1, Math.min(15, streakGames + delta));
        if (type === "h")
          streakMin = Math.max(1, Math.min(8, streakMin + delta));
        document.getElementById("sg").textContent = streakGames;
        document.getElementById("sh").textContent = streakMin;
        if (streakFilter || streakHide) render();
      }

      function toggleStreakFilter() {
        streakFilter = !streakFilter;
        if (streakFilter) streakHide = false;
        document
          .getElementById("streak-filter-btn")
          .classList.toggle("active", streakFilter);
        document.getElementById("streak-hide-btn").classList.remove("active");
        render();
      }

      function toggleStreakHide() {
        streakHide = !streakHide;
        if (streakHide) streakFilter = false;
        document
          .getElementById("streak-hide-btn")
          .classList.toggle("active", streakHide);
        document.getElementById("streak-filter-btn").classList.remove("active");
        render();
      }

      function render() {
        const src = slateOnly ? SLATE : ALL;
        let rows = Object.values(src).filter((p) => slateOnly || p.games >= minG);
        if (q)
          rows = rows.filter((p) =>
            p.name.toLowerCase().includes(q.toLowerCase()),
          );
        // Exclude bench players when lineup is confirmed
        rows = rows.filter(
          (p) => !(p.lineup_confirmed && p.lineup_order === null),
        );
        if (streakFilter)
          rows = rows.filter(
            (p) => getStreak(p.log || [], streakMin) >= streakGames,
          );
        if (streakHide)
          rows = rows.map((p) => ({
            ...p,
            _dim: getStreak(p.log || [], streakMin) < streakGames,
          }));
        if (selectedGame !== null) {
          const g = GAMES[selectedGame];
          rows = rows.filter(
            (p) => p.team_id === g.home_id || p.team_id === g.away_id,
          );
        }
        if (hideLive) {
          const liveTeams = new Set(
            GAMES.filter(
              (g) => g.game_state === "Live" || g.game_state === "Final",
            ).flatMap((g) => [g.home_id, g.away_id]),
          );
          rows = rows.filter((p) => !liveTeams.has(p.team_id));
        }
        if (primeOnly) {
          rows = rows.filter((p) => (p.e_hrr || 0) >= 2.0 && (p.matchup_score || 0) >= 60);
        }
        if (primePlusOnly) {
          rows = rows.filter((p) => (p.e_hrr || 0) >= 2.3 && (p.matchup_score || 0) >= 65);
        }
        const sv = (r) => {
          if (col === "best")
            return bestStreak(r.log_full || r.log || [], streakMin);
          if (col === "avgstreak")
            return avgStreakLen(r.log_full || r.log || [], streakMin) || 0;
          if (col === "streak") return getStreak(r.log || [], streakMin);
          if (col === "p1") {
            const s = compositeScore(r);
            return s === null ? -1 : s;
          }
          if (col === "trend") return r.trend || 0;
          if (col === "e_hrr") return r.e_hrr || 0;
          if (col === "e_bases") return r.e_bases || 0;
          if (col === "e_hr") return r.e_hr || 0;
          if (col === "matchup_score") return r.matchup_score || 0;
          if (col === "pick_score") return r.pick_score || 0;
          return r[col] || 0;
        };
        rows.sort((a, b) => (sv(b) - sv(a)) * dir);
        const tb = document.getElementById("tb");
        const em = document.getElementById("em");
        if (!rows.length) {
          tb.innerHTML = "";
          em.style.display = "";
          return;
        }
        em.style.display = "none";
        const logMap = {};
        Object.values(src).forEach((p) => (logMap[p.name] = p.log || []));
        tb.innerHTML = rows
          .map(
            (
              p,
              i,
            ) => `<tr style="${p._dim ? "opacity:0.2" : ""}" class="${highlighted.has(p.pid) ? "row-highlight" : ""}" onclick="toggleHighlight(event,'${p.pid}')">
    <td class="pad" style="color:var(--muted);font-size:10px">${i + 1}</td>
    <td class="name-td"><div class="player-cell">${logoImg(p)}${p.form_tag === "Hot" ? '<span style="font-size:9px;margin-right:2px" title="Hot form">🔥</span>' : p.form_tag === "Slump" ? '<span style="font-size:9px;margin-right:2px" title="Slump">❄️</span>' : ""}${p.pull_risk >= 25 ? `<span style="font-size:9px;margin-right:2px" title="SHORT GAME: ${p.pull_risk}% of games get ≤2 AB">🩳</span>` : ""}<span class="pname">${p.name}</span>${p.is_danger ? '<span style="color:#e3b341;font-size:8px;margin-left:2px" title="HR BLAST BvP">☄️</span>' : ""}${windBadge(p)}${accBadge(p)}</div></td>
    <td style="text-align:center">${p.sp_confirmed ? '<span style="color:#58a6ff;font-weight:700;font-size:13px">✓</span>' : '<span style="color:rgba(255,255,255,0.12)">—</span>'}</td>
    <td style="text-align:center">${p.lineup_confirmed ? '<span style="color:#39d353;font-weight:700;font-size:13px">✓</span>' : '<span style="color:rgba(255,255,255,0.12)">—</span>'}</td>
    <td class="pad" style="color:var(--muted);font-size:11px">${p.games}</td>
    <td style="text-align:center">${bestCell(p)}</td>
    <td style="text-align:center">${avgStreakCell(p)}</td>
    <td style="text-align:center">${streakBadge(p)}</td>
    <td><canvas width="158" height="38" data-n="${p.name}"></canvas></td>
    <td class="status-td">${tierIcon(p)}</td>
    <td class="status-td">${bpIcon(p)}</td>
    <td class="mu-td">${muCell(p)}</td>
    <td>${predCell(p.e_hrr)}</td>
    <td>${predCell(p.e_bases)}</td>
    <td>${predCell(p.e_hr, 1, p.xhr_gap)}</td>
    <td>${(() => { const log = p.log || []; const l3 = log.slice(-3); const avg = l3.length ? (l3.reduce((a,b)=>a+b,0)/l3.length) : null; return avg != null ? hcell(avg) : '<span style="color:rgba(255,255,255,0.1)">—</span>'; })()}</td>
    <td>${adjCell(adjMetric(p.whiff_pct,p.p_whiff,LG_AVG.whiff),LG_AVG.whiff,false,true)}</td>
    <td>${adjCell(adjMetric(p.blast_rate,p.p_barrel_rate,LG_AVG.barrel),LG_AVG.barrel,false)}</td>
    <td>${adjCell(adjMetric(p.sweet_spot_pct,p.p_sweet_spot_pct,LG_AVG.sweet),LG_AVG.sweet,false)}</td>
    <td>${adjCell(adjMetric(p.flyball_pct,p.p_flyball_pct,LG_AVG.fb),LG_AVG.fb,false)}</td>
    <td>${adjCell(adjMetric(p.hard_hit_pct,p.p_hard_hit_pct,LG_AVG.hh),LG_AVG.hh,false)}</td>
    <td>${adjCell(adjMetric(p.xslg,p.p_xslg,LG_AVG.xslg),LG_AVG.xslg,true)}</td>
    <td>${adjCell(adjMetric(p.xwoba,p.p_xwoba,LG_AVG.xwoba),LG_AVG.xwoba,true)}</td>
    <td>${adjCell(adjMetric(p.xwobacon,p.p_xwobacon,LG_AVG.xwobacon),LG_AVG.xwobacon,true)}</td>
    <td>${hcell(p.hr, 0)}</td>
  </tr>`,
          )
          .join("");
        document
          .querySelectorAll("canvas[data-n]")
          .forEach((c) => drawSpark(c, logMap[c.dataset.n] || []));
        const all = Object.values(ALL).filter((p) => p.games >= minG);
        const b2 = [...all].sort((a, b) => b.hrr2_pct - a.hrr2_pct)[0];
        const b3 = [...all].sort((a, b) => b.hrr3_pct - a.hrr3_pct)[0];
        // Avg HRR streak = average streak length across all qualified slate players
        const srcT = Object.values(slateOnly ? SLATE : ALL).filter(
          (p) => p.games >= minG,
        );
        const streaks = srcT
          .map((p) => getStreak(p.log || [], streakMin))
          .filter((s) => s > 0);
        const avgStreak = streaks.length
          ? streaks.reduce((a, b) => a + b, 0) / streaks.length
          : 0;
        const maxStreakP = srcT.reduce(
          (best, p) => {
            const s = getStreak(p.log || [], streakMin);
            return s > getStreak(best.log || [], streakMin) ? p : best;
          },
          { log: [] },
        );
        const maxS = getStreak(maxStreakP.log || [], streakMin);
        // Streak stat tile — shows continuation % for current streak filter
        const contPct = CONT_PROB[streakGames] || null;
        const contCount = CONT_COUNTS[streakGames] || 0;
        const nextG = streakGames + 1;
        const tier =
          streakGames >= 7
            ? "🔥 JUMP ON"
            : streakGames >= 5
              ? "⚡ LEAN"
              : "→ NEUTRAL";
        // streak-stat tile removed
        document.getElementById("tstreak").textContent =
          maxS > 0 ? maxS + " Games" : "—";
        document.getElementById("tstreakn").textContent =
          maxS > 0 ? maxStreakP.name : "no active streaks";
        const slateAll = Object.values(SLATE);
        document.getElementById("ts").textContent = slateAll.length;
        document.getElementById("tsl").textContent = slateAll.filter(
          (p) => p.lineup_confirmed,
        ).length;
        // Accuracy tile
        const acc = PRED_ACCURACY;
        document.getElementById("tacc").textContent =
          acc.total > 0 ? acc.accuracy + "%" : "—";
        document.getElementById("taccn").textContent =
          acc.total > 0
            ? acc.hits + "/" + acc.total + " correct"
            : "no data yet";
        // Top-10 W/L tiles
        function t10tile(id, subn, stat) {
          const s = acc.top10?.[stat] || { hits: 0, total: 0, accuracy: 0 };
          if (!s.total) {
            document.getElementById(id).textContent = "—";
            document.getElementById(subn).textContent = "no data yet";
          } else {
            document.getElementById(id).textContent =
              s.hits + "W-" + (s.total - s.hits) + "L";
            document.getElementById(subn).textContent =
              s.accuracy + "% · " + s.total + " picks";
          }
        }
        t10tile("t10-hrr", "t10-hrrn", "hrr");
        t10tile("t10-bases", "t10-basesn", "bases");
        t10tile("t10-hr", "t10-hrn", "hr");
        // PRIME tile
        const primeGraded = (PRED_ACCURACY.graded || []).filter(p => (p.e_hrr||0) >= 2.0 && (p.matchup_score||0) >= 60 && p.hit !== null && p.hit !== undefined);
        if (primeGraded.length) {
          const pw = primeGraded.filter(p => p.hit).length;
          const pl2 = primeGraded.length - pw;
          const ppct = Math.round(100*pw/primeGraded.length);
          document.getElementById("t-prime").textContent = pw + "-" + pl2;
          document.getElementById("t-primen").textContent = ppct + "% · " + primeGraded.length + " picks";
        }
        // PRIME+ tile
        const ppGraded2 = (PRED_ACCURACY.graded || []).filter(p => (p.e_hrr||0) >= 2.3 && (p.matchup_score||0) >= 65 && p.hit !== null && p.hit !== undefined);
        if (ppGraded2.length) {
          const ppw = ppGraded2.filter(p => p.hit).length;
          const ppl = ppGraded2.length - ppw;
          const pppct = Math.round(100*ppw/ppGraded2.length);
          document.getElementById("t-primeplus").textContent = ppw + "-" + ppl;
          document.getElementById("t-primeplusn").textContent = pppct + "% · " + ppGraded2.length + " picks";
        }
      }
      function buildStrip() {
        const strip = document.getElementById("games-strip");
        strip.innerHTML = "";
        const seeAll = document.createElement("div");
        seeAll.className =
          "game-pill see-all" + (selectedGame === null ? " pill-active" : "");
        const allLogos = GAMES.map((g) => {
          const ids = new Set([g.away_id, g.home_id]);
          return [...ids]
            .map((id) =>
              id
                ? `<img src="https://www.mlbstatic.com/team-logos/${id}.svg" style="width:12px;height:12px;object-fit:contain" onerror="this.style.display='none'">`
                : "",
            )
            .join("");
        }).join("");
        seeAll.innerHTML = `⚾ ALL`;
        seeAll.onclick = () => {
          selectedGame = null;
          buildStrip();
          render();
        };
        strip.appendChild(seeAll);
        GAMES.forEach((g, i) => {
          const t = new Date(g.time);
          const time = t.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/Chicago",
          });
          const pill = document.createElement("div");
          const gs = g.game_state || "";
          const stateCls =
            gs === "Live" ? " pill-live" : gs === "Final" ? " pill-final" : "";
          pill.className =
            "game-pill" + stateCls + (selectedGame === i ? " pill-active" : "");
          const aL = g.away_id
            ? `<img src="https://www.mlbstatic.com/team-logos/${g.away_id}.svg" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:3px" onerror="this.style.display='none'">`
            : "";
          const hL = g.home_id
            ? `<img src="https://www.mlbstatic.com/team-logos/${g.home_id}.svg" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:3px" onerror="this.style.display='none'">`
            : "";
          const edgePct = g.edge_pct || 0;
          const totalEhrr = (g.away_sum_ehrr || 0) + (g.home_sum_ehrr || 0);
          const estRuns = Math.round(totalEhrr * 0.15 * 2) / 2;
          const ouStr = g.ou_line ? ` · O/U ${g.ou_line}` : "";
          const runStr = ` · Est ${estRuns} runs${ouStr}`;
          let edgeStr = "";
          if (edgePct >= 25) {
            edgeStr = `<span style="display:block;font-size:14px;color:#00c853;margin-top:4px;font-weight:700">⚡ ${g.lean} +${edgePct}% edge${runStr}</span>`;
          } else if (edgePct >= 10) {
            edgeStr = `<span style="display:block;font-size:14px;color:#58d68d;margin-top:4px;font-weight:700">⚡ ${g.lean} +${edgePct}% edge${runStr}</span>`;
          } else if (edgePct >= 5) {
            edgeStr = `<span style="display:block;font-size:14px;color:#c9a800;margin-top:4px;font-weight:600">⚡ ${g.lean} +${edgePct}% edge${runStr}</span>`;
          } else {
            edgeStr = `<span style="display:block;font-size:14px;color:#8b949e;margin-top:4px">Toss-up${runStr}</span>`;
          }
          // Game environment tag
          const tagColor = g.game_tag === "Favorable" ? "#00c853" : g.game_tag === "Unfavorable" ? "#f85149" : "#555";
          const boostStr = g.park_boost ? ` · ${g.park_boost.toFixed(2)}x boost` : "";
          const envTag = g.game_tag ? `<span style="display:block;font-size:11px;color:${tagColor};margin-top:2px">${g.game_tag === "Favorable" ? "🟢" : g.game_tag === "Unfavorable" ? "🔴" : "⚪"} ${g.game_tag}${boostStr}</span>` : "";
          pill.innerHTML = `${wxBadge(g)}<strong>${aL}${g.away} @ ${hL}${g.home}</strong><span>${g.away_sp} vs ${g.home_sp} · ${time} CT</span>${edgeStr}${envTag}`;
          pill.onclick = () => {
            selectedGame = selectedGame === i ? null : i;
            buildStrip();
            render();
          };
          strip.appendChild(pill);
        });
      }
      function wxBadge(g) {
        if (g.dome)
          return (
            '<div class="wx-badge"><span class="dome">🏟 Dome</span> · ' +
            Math.round(g.temp_f || 72) +
            "°F</div>"
          );
        const mph = Math.round(g.wind_mph || 0);
        const wm = g.wind_mult || 1;
        const boost = Math.round((wm - 1) * 100);
        const cls = boost >= 15 ? "wind-hot" : boost >= 8 ? "wind-warm" : "";
        const lines = [];
        if (g.temp_f) lines.push(Math.round(g.temp_f) + "°F");
        if (mph > 0)
          lines.push(
            "<span" +
              (cls ? ' class="' + cls + '"' : "") +
              ">" +
              mph +
              " mph</span>",
          );
        if (g.wind_label) {
          const lbl = g.wind_label.toUpperCase();
          const normalized =
            lbl.includes("BLOWING OUT") || lbl === "OUT"
              ? "OUT"
              : lbl.includes("BLOWING IN") || lbl === "IN"
                ? "IN"
                : lbl.includes("CROSS")
                  ? "CROSS"
                  : lbl === "DOME"
                    ? null
                    : null;
          if (normalized) lines.push(normalized);
        }
        return lines.length
          ? '<div class="wx-badge">' + lines.join(" · ") + "</div>"
          : "";
      }
      document.querySelectorAll('thead th[id^="h-"]').forEach((th) => {
        const k = th.id.replace("h-", "");
        if (["name", "games"].includes(k)) return;
        th.addEventListener("click", () => setSort(k));
      });
      // Explicit sort handlers for icon columns
      document
        .querySelectorAll(".btn[data-s]")
        .forEach((b) =>
          b.addEventListener("click", () => setSort(b.dataset.s)),
        );
      document.getElementById("mg").addEventListener("change", (e) => {
        minG = parseInt(e.target.value);
        render();
      });
      document.getElementById("sq").addEventListener("input", (e) => {
        q = e.target.value;
        const clearBtn = document.getElementById("sq-clear");
        if (clearBtn) clearBtn.style.display = q ? "block" : "none";
        render();
      });
      document.getElementById("h-e_hrr").textContent = "E-HRR ▾";
      document.getElementById("h-e_hrr").classList.add("sorted");
      buildStrip();
      render();
      rebuildAccPanel();