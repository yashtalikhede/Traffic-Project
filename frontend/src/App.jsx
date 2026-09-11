import { useState, useEffect } from "react";

const LEVELS = {
  FREE:     { color: "#16a34a", light: "#dcfce7", text: "#14532d", dot: "#22c55e", label: "Clear Roads" },
  MODERATE: { color: "#d97706", light: "#fef3c7", text: "#78350f", dot: "#f59e0b", label: "Moderate" },
  HIGH:     { color: "#ea580c", light: "#ffedd5", text: "#7c2d12", dot: "#f97316", label: "Heavy Traffic" },
  SEVERE:   { color: "#dc2626", light: "#fee2e2", text: "#7f1d1d", dot: "#ef4444", label: "GRIDLOCK" },
};

const COLLEGE_IMGS = {
  "PICT Pune":        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80",
  "COEP Pune":        "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&q=80",
  "VIT Pune":         "https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80",
  "MIT Pune":         "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80",
  "Pune University":  "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=600&q=80",
  "PCCE Pimpri":      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80",
  "NIT Pune":         "https://images.unsplash.com/photo-1567168544813-cc03465b4fa8?w=600&q=80",
  "Symbiosis Lavale": "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=600&q=80",
};

const HERO_SLIDES = [
  { img: "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=1600&q=80", title: "Every jam\ntells a story.", sub: "Pune traffic predicts college attendance — before students leave home." },
  { img: "https://images.unsplash.com/photo-1519003300449-424ad0405076?w=1600&q=80", title: "Road data.\nAttendance predicted.", sub: "TomTom API + Hadoop HDFS + PySpark on YARN." },
  { img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80", title: "The city\nis your dataset.", sub: "8 college zones. Live road speeds. One dashboard." },
];

const STRIP_IMGS = [
  { src: "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=800&q=80", label: "Two-wheelers" },
  { src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80", label: "City Roads" },
  { src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80", label: "Students" },
  { src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80", label: "Pune" },
];

function getMock() {
  const h = new Date().getHours(), rush = h >= 7 && h <= 9;
  const defs = [
    { college: "PICT Pune",        road: "Katraj-Dehu Road",     base: rush ? 72 : 28 },
    { college: "COEP Pune",        road: "FC Road Shivajinagar", base: rush ? 58 : 22 },
    { college: "VIT Pune",         road: "Kondhwa Road",         base: rush ? 81 : 35 },
    { college: "MIT Pune",         road: "Paud Road Kothrud",    base: rush ? 64 : 18 },
    { college: "Pune University",  road: "Ganeshkhind Road",     base: rush ? 45 : 15 },
    { college: "PCCE Pimpri",      road: "Nigdi-Akurdi Road",    base: rush ? 55 : 20 },
    { college: "NIT Pune",         road: "Narhe Road",           base: rush ? 38 : 12 },
    { college: "Symbiosis Lavale", road: "Lavale-Hinjewadi Rd",  base: rush ? 68 : 30 },
  ];
  return defs.map(c => {
    const cong = Math.min(100, Math.max(0, c.base + (Math.random() * 18 - 9)));
    const r    = Math.round(cong * 10) / 10;
    const lv   = r >= 70 ? "SEVERE" : r >= 45 ? "HIGH" : r >= 20 ? "MODERATE" : "FREE";
    const att  = Math.max(42, 88 - r * 0.28 - (rush ? 6.5 : 0) - (lv === "SEVERE" ? 8 : 0));
    const late = Math.min(98, r * 0.85 * (rush ? 1.4 : 1));
    return { ...c, avg_congestion: r, congestion_level: lv,
      predicted_attendance: Math.round(att * 10) / 10,
      late_arrival_prob: Math.round(late * 10) / 10,
      min_speed: Math.max(5, Math.round(60 - r * 0.5)),
      is_morning_rush: rush, alert: lv === "SEVERE" && rush };
  }).sort((a, b) => b.avg_congestion - a.avg_congestion);
}

function Pill({ color, bg, border, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
      background: bg, border: "1px solid " + border,
      borderRadius: 999, padding: "4px 14px",
      fontSize: 10, fontWeight: 700, color: color, letterSpacing: "0.1em" }}>
      {children}
    </span>
  );
}

function LiveDot({ color }) {
  return (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color,
      display: "inline-block", flexShrink: 0,
      boxShadow: "0 0 0 0 " + color, animation: "livepulse 2s ease-in-out infinite" }} />
  );
}

function Bar({ value, color }) {
  return (
    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: value + "%", borderRadius: 4,
        background: "linear-gradient(90deg," + color + "88," + color + ")",
        transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function CollegeCard({ c, onClick }) {
  const cfg = LEVELS[c.congestion_level] || LEVELS.FREE;
  const img = COLLEGE_IMGS[c.college] || COLLEGE_IMGS["PICT Pune"];
  const ac  = c.predicted_attendance > 70 ? "#16a34a" : c.predicted_attendance > 55 ? "#d97706" : "#dc2626";
  const [hov, setHov] = useState(false);

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onClick} style={{ background: "#fff", borderRadius: 20, overflow: "hidden",
        cursor: "pointer", border: "1px solid #ebebeb",
        boxShadow: hov ? "0 20px 60px rgba(0,0,0,0.13)" : "0 2px 16px rgba(0,0,0,0.06)",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(.4,0,.2,1)" }}>

      <div style={{ position: "relative", height: 155, overflow: "hidden" }}>
        <img src={img} alt={c.college} style={{ width: "100%", height: "100%", objectFit: "cover",
          filter: "brightness(0.82) saturate(1.1)",
          transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform 0.5s ease" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.58) 100%)" }} />
        <div style={{ position: "absolute", top: 11, left: 11 }}>
          <span style={{ background: cfg.light, borderRadius: 999, padding: "3px 10px",
            fontSize: 10, fontWeight: 700, color: cfg.text }}>{cfg.label}</span>
        </div>
        {c.alert && (
          <div style={{ position: "absolute", top: 11, right: 11, display: "flex",
            alignItems: "center", gap: 5, background: "#fee2e2", borderRadius: 999,
            padding: "3px 10px", border: "1px solid #fca5a5" }}>
            <LiveDot color="#dc2626" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>ALERT</span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 11, left: 13 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff",
            fontFamily: "'Outfit',sans-serif" }}>{c.college}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.72)", marginTop: 2 }}>{c.road}</div>
        </div>
      </div>

      <div style={{ padding: "15px 17px 17px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800,
              color: cfg.color, lineHeight: 1 }}>{Math.round(c.avg_congestion)}%</div>
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3, letterSpacing: "0.07em" }}>CONGESTION</div>
          </div>
          <div style={{ width: 1, background: "#f0f0f0" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800,
              color: ac, lineHeight: 1 }}>{c.predicted_attendance}%</div>
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3, letterSpacing: "0.07em" }}>ATTENDANCE</div>
          </div>
          <div style={{ width: 1, background: "#f0f0f0" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800,
              color: "#6366f1", lineHeight: 1 }}>{c.min_speed}</div>
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3, letterSpacing: "0.07em" }}>KM/H</div>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "#6b7280" }}>Road congestion</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{Math.round(c.avg_congestion)}%</span>
          </div>
          <Bar value={c.avg_congestion} color={cfg.color} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>Late arrival risk</span>
          <span style={{ background: "#f5f3ff", border: "1px solid #e9d5ff", borderRadius: 999,
            padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>
            {Math.round(c.late_arrival_prob)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function Modal({ c, onClose }) {
  if (!c) return null;
  const cfg = LEVELS[c.congestion_level] || LEVELS.FREE;
  const img = COLLEGE_IMGS[c.college] || COLLEGE_IMGS["PICT Pune"];
  const ac  = c.predicted_attendance > 70 ? "#16a34a" : c.predicted_attendance > 55 ? "#d97706" : "#dc2626";
  const acBg = c.predicted_attendance > 70 ? "#dcfce7" : c.predicted_attendance > 55 ? "#fef3c7" : "#fee2e2";

  const modelFormula = "attendance = 88 − (" + Math.round(c.avg_congestion) + " × 0.28)"
    + (c.is_morning_rush ? " − 6.5 (rush)" : "")
    + (c.congestion_level === "SEVERE" ? " − 8.0 (gridlock)" : "")
    + " = " + c.predicted_attendance + "%";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadein 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 28,
        width: 520, maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 40px 100px rgba(0,0,0,0.25)",
        animation: "slideup 0.3s cubic-bezier(.4,0,.2,1)" }}>

        <div style={{ position: "relative", height: 220, flexShrink: 0 }}>
          <img src={img} alt={c.college} style={{ width: "100%", height: "100%",
            objectFit: "cover", filter: "brightness(0.65) saturate(1.2)" }} />
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(to bottom,transparent 25%,rgba(0,0,0,0.72) 100%)" }} />
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14,
            background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%",
            width: 34, height: 34, cursor: "pointer", fontSize: 18, color: "#374151",
            display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <div style={{ position: "absolute", bottom: 18, left: 22 }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800,
              color: "#fff" }}>{c.college}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>{c.road}</div>
          </div>
        </div>

        <div style={{ padding: "22px 26px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            <div style={{ background: cfg.light, borderRadius: 14, padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: cfg.text, letterSpacing: "0.1em", fontWeight: 700,
                marginBottom: 6, opacity: 0.7 }}>CONGESTION</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800,
                color: cfg.color, lineHeight: 1 }}>{Math.round(c.avg_congestion)}%</div>
            </div>
            <div style={{ background: acBg, borderRadius: 14, padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: ac, letterSpacing: "0.1em", fontWeight: 700,
                marginBottom: 6, opacity: 0.7 }}>ATTENDANCE</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800,
                color: ac, lineHeight: 1 }}>{c.predicted_attendance}%</div>
            </div>
            <div style={{ background: "#f5f3ff", borderRadius: 14, padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#7c3aed", letterSpacing: "0.1em", fontWeight: 700,
                marginBottom: 6, opacity: 0.7 }}>LATE RISK</div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800,
                color: "#7c3aed", lineHeight: 1 }}>{Math.round(c.late_arrival_prob)}%</div>
            </div>
          </div>

          <div style={{ background: "#f8faff", borderRadius: 14, padding: "16px 18px",
            border: "1px solid #e0e7ff", marginBottom: c.alert ? 14 : 0 }}>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 700,
              letterSpacing: "0.1em", marginBottom: 8 }}>PREDICTION MODEL</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#374151",
              lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{modelFormula}</div>
          </div>

          {c.alert && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3",
              borderRadius: 14, padding: "14px 16px",
              display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🚨</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Severe gridlock during rush hour</div>
                <div style={{ fontSize: 11, color: "#9f1239", marginTop: 4, lineHeight: 1.6 }}>
                  Expect significant first-lecture attendance drop. Students on two-wheelers may arrive 20-40 min late.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [colleges, setColleges] = useState([]);
  const [sel, setSel]           = useState(null);
  const [now, setNow]           = useState(new Date());
  const [slide, setSlide]       = useState(0);
  const [tick, setTick]         = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/snapshot");
        if (res.ok) {
          const j = await res.json();
          setColleges(j.colleges && j.colleges.length > 0 ? j.colleges : getMock());
        } else {
          setColleges(getMock());
        }
      } catch (_) {
        setColleges(getMock());
      }
      setLoading(false);
      setTick(t => t + 1);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const rush    = now.getHours() >= 7 && now.getHours() <= 9;
  const avgCong = colleges.length ? Math.round(colleges.reduce((s, c) => s + c.avg_congestion, 0) / colleges.length) : 0;
  const alerts  = colleges.filter(c => c.alert).length;
  const selObj  = sel ? colleges.find(c => c.college === sel) : null;
  const cur     = HERO_SLIDES[slide];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans',sans-serif", flexDirection: "column", gap: 16 }}>
        <style>{"@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');"}</style>
        <div style={{ width: 40, height: 40, border: "3px solid #ea580c22",
          borderTopColor: "#ea580c", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 14, color: "#6b7280" }}>Loading traffic data...</div>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4",
      fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        img { display: block; }
        @keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
        @keyframes slideup { from{transform:translateY(28px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes tickerMove { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes herofade { from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px}
      `}</style>

      {/* NAV */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #ebebeb",
        padding: "0 48px", height: 62, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#f97316,#dc2626)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚦</div>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800,
              color: "#111", letterSpacing: "-0.03em" }}>PuneTraffic.ai</div>
            <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: "0.1em" }}>ATTENDANCE INTELLIGENCE</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 17, fontWeight: 700, color: "#111" }}>
            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <Pill color="#16a34a" bg="#dcfce7" border="#86efac">
            <LiveDot color="#16a34a" />
            {rush ? "RUSH HOUR" : "LIVE"}
          </Pill>
        </div>
      </nav>

      {/* TICKER */}
      <div style={{ background: "#111", height: 34, overflow: "hidden",
        display: "flex", alignItems: "center" }}>
        <div style={{ whiteSpace: "nowrap", animation: "tickerMove 45s linear infinite",
          fontSize: 11, color: "#9ca3af", letterSpacing: "0.04em" }}>
          {colleges.concat(colleges).map((c, i) => {
            const cfg = LEVELS[c.congestion_level] || LEVELS.FREE;
            return (
              <span key={i} style={{ marginRight: 48 }}>
                <span style={{ color: cfg.dot }}>● </span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{c.college}</span>
                <span style={{ color: "#6b7280" }}> — {Math.round(c.avg_congestion)}% congestion → </span>
                <span style={{ color: "#fbbf24" }}>{c.predicted_attendance}% attendance expected</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* HERO */}
      <section style={{ position: "relative", height: 560, overflow: "hidden" }}>
        <img key={slide} src={cur.img} alt="traffic" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", filter: "brightness(0.42) saturate(1.2)",
          animation: "herofade 1.2s ease" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(115deg,rgba(234,88,12,0.5) 0%,rgba(10,5,2,0.72) 65%)" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "0 80px", height: "100%",
          display: "flex", alignItems: "center", gap: 72 }}>

          {/* Left */}
          <div style={{ flex: "0 0 480px" }}>
            <Pill color="#fb923c" bg="rgba(251,146,60,0.15)" border="rgba(251,146,60,0.4)">
              <LiveDot color="#fb923c" />
              LIVE TRAFFIC INTELLIGENCE · PUNE
            </Pill>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 50, fontWeight: 900,
              color: "#fff", lineHeight: 1.05, letterSpacing: "-0.03em",
              margin: "18px 0 16px", whiteSpace: "pre-line" }}>{cur.title}</h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)",
              lineHeight: 1.75, maxWidth: 380, marginBottom: 28 }}>{cur.sub}</p>
            <div style={{ display: "flex", gap: 8 }}>
              {HERO_SLIDES.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} style={{
                  width: i === slide ? 28 : 8, height: 8, borderRadius: 4,
                  background: i === slide ? "#fb923c" : "rgba(255,255,255,0.3)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all 0.3s ease" }} />
              ))}
            </div>
          </div>

          {/* Right: stats glass */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ background: "rgba(255,255,255,0.09)", backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: 24,
              padding: "26px 30px", minWidth: 320 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em",
                fontWeight: 600, marginBottom: 18 }}>LIVE CITY SNAPSHOT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                {[
                  { l: "City Congestion", v: avgCong + "%",   c: avgCong > 50 ? "#fb923c" : "#4ade80" },
                  { l: "Colleges Live",   v: colleges.length, c: "#93c5fd" },
                  { l: "Active Alerts",   v: alerts,          c: alerts > 0 ? "#f87171" : "#4ade80" },
                  { l: "Refreshes",       v: tick,            c: "#c4b5fd" },
                ].map(s => (
                  <div key={s.l} style={{ background: "rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: "13px 15px" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)",
                      letterSpacing: "0.09em", marginBottom: 5 }}>{s.l.toUpperCase()}</div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24,
                      fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {rush && (
                <div style={{ background: "rgba(251,146,60,0.18)", borderRadius: 12,
                  padding: "10px 13px", border: "1px solid rgba(251,146,60,0.35)" }}>
                  <div style={{ fontSize: 12, color: "#fed7aa", fontWeight: 600 }}>
                    ⚡ Morning rush hour — congestion peaks 8–9 AM
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PHOTO STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", height: 155, overflow: "hidden" }}>
        {STRIP_IMGS.map(({ src, label }) => (
          <div key={label} style={{ position: "relative", overflow: "hidden" }}>
            <img src={src} alt={label} style={{ width: "100%", height: "100%",
              objectFit: "cover", filter: "brightness(0.68) saturate(1.1)" }} />
            <div style={{ position: "absolute", inset: 0,
              background: "linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)" }} />
            <div style={{ position: "absolute", bottom: 11, left: 13,
              fontSize: 12, fontWeight: 700, color: "#fff",
              fontFamily: "'Outfit',sans-serif" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "56px 36px" }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#ea580c",
              letterSpacing: "0.14em", marginBottom: 8 }}>REAL-TIME INTELLIGENCE</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 900,
              color: "#111", letterSpacing: "-0.03em", lineHeight: 1, margin: 0 }}>
              Pune College<br />Traffic Dashboard
            </h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Last updated</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 700 }}>
              {now.toLocaleTimeString("en-IN")}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{tick} auto-refreshes</div>
          </div>
        </div>

        {/* Top 3 spotlight */}
        {colleges.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280",
              letterSpacing: "0.1em", marginBottom: 14 }}>HIGHEST CONGESTION RIGHT NOW</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {colleges.slice(0, 3).map((c, i) => {
                const cfg = LEVELS[c.congestion_level] || LEVELS.FREE;
                const img = COLLEGE_IMGS[c.college] || COLLEGE_IMGS["PICT Pune"];
                const rankColors = ["#dc2626", "#ea580c", "#d97706"];
                return (
                  <div key={c.college} onClick={() => setSel(c.college)} style={{
                    borderRadius: 20, overflow: "hidden", cursor: "pointer",
                    position: "relative", height: 210,
                    boxShadow: i === 0 ? "0 8px 40px rgba(220,38,38,0.18)" : "0 4px 20px rgba(0,0,0,0.08)",
                    border: i === 0 ? "2px solid " + cfg.color + "55" : "1px solid #ebebeb",
                  }}>
                    <img src={img} alt={c.college} style={{ width: "100%", height: "100%",
                      objectFit: "cover", filter: "brightness(0.5) saturate(1.2)" }} />
                    <div style={{ position: "absolute", inset: 0,
                      background: "linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 55%)" }} />
                    <div style={{ position: "absolute", top: 13, left: 13 }}>
                      <span style={{ background: rankColors[i], borderRadius: 999,
                        padding: "3px 11px", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                        #{i + 1} {i === 0 ? "WORST" : ""}
                      </span>
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15,
                        fontWeight: 700, color: "#fff", marginBottom: 8 }}>{c.college}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ background: cfg.light, borderRadius: 999, padding: "3px 10px",
                          fontSize: 11, fontWeight: 700, color: cfg.text }}>
                          {Math.round(c.avg_congestion)}% jam
                        </span>
                        <span style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
                          borderRadius: 999, padding: "3px 10px", fontSize: 11, color: "#fff" }}>
                          {c.predicted_attendance}% attendance
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All colleges grid */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280",
          letterSpacing: "0.1em", marginBottom: 18 }}>ALL COLLEGES — CLICK ANY CARD FOR DETAILS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 72 }}>
          {colleges.map(c => (
            <CollegeCard key={c.college} c={c} onClick={() => setSel(c.college)} />
          ))}
        </div>

        {/* HOW IT WORKS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#ea580c",
              letterSpacing: "0.14em", marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 900,
              color: "#111", letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 18 }}>
              Road speed → Attendance prediction
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.8, marginBottom: 22 }}>
              Every 60s, TomTom Traffic API streams live road speeds for 8 Pune college zones.
              Hadoop HDFS stores each snapshot. PySpark on YARN aggregates and applies
              our regression model to predict today's attendance percentage.
            </p>
            <div style={{ background: "#f8faff", borderRadius: 14, padding: "16px 20px",
              border: "1px solid #e0e7ff", fontFamily: "monospace",
              fontSize: 12, color: "#374151", lineHeight: 2 }}>
              attendance = 88<br />
              &nbsp;&nbsp;− (congestion × 0.28)<br />
              &nbsp;&nbsp;− (rush_hour × 6.5)<br />
              &nbsp;&nbsp;− (gridlock × 8.0)
            </div>
          </div>
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 300 }}>
            <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80"
              alt="highway" style={{ width: "100%", height: "100%", objectFit: "cover",
                filter: "brightness(0.65) saturate(1.2)" }} />
            <div style={{ position: "absolute", inset: 0,
              background: "linear-gradient(135deg,rgba(234,88,12,0.38) 0%,transparent 60%)" }} />
            <div style={{ position: "absolute", left: 20, top: 0, bottom: 0,
              display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              {["TomTom API", "→  Hadoop HDFS", "→  PySpark YARN", "→  FastAPI SSE", "→  React Live"].map((s, i) => (
                <div key={s} style={{ background: "rgba(255,255,255,0.92)", borderRadius: 999,
                  padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#111",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "inline-block" }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ background: "#111", padding: "28px 48px",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚦</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14,
            fontWeight: 800, color: "#fff" }}>PuneTraffic.ai</span>
          <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 4 }}>
            Big Data Final Year Project
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          TomTom API · Hadoop HDFS · PySpark on YARN · FastAPI · React
        </div>
      </footer>

      <Modal c={selObj} onClose={() => setSel(null)} />
    </div>
  );
}
