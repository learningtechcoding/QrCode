// Builds the static pages and keeps the shared head/header/footer of generator.html in sync.
// Run: node tools/build-pages.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const SITE = 'https://example.com'; // replace with the real domain

const ICONS = `<!--icons-->
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="48x48">
<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#e9f0ee" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1a18" media="(prefers-color-scheme: dark)">
<link rel="preload" href="assets/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<!--/icons-->`;

const MARK = '<svg viewBox="0 0 9 9" aria-hidden="true" focusable="false"><path class="i" d="M0 0h7v7H0zM1 1v5h5V1z" fill-rule="evenodd"/><rect class="i" x="2" y="2" width="3" height="3"/><rect class="a" x="6" y="6" width="3" height="3"/></svg>';

const header = current => {
  const a = (f, label) => `<a href="${f}"${current === f ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="site"><div class="wrap">
  <a class="logo" href="index.html" aria-label="QR Studio home">${MARK}<span>QR<b>Studio</b></span></a>
  <nav class="main" aria-label="Main">${a('generator.html', 'Generator')}${a('help.html', 'Help &amp; FAQ')}${a('contact.html', 'Contact')}</nav>
</div></header>`;
};
const footer = `<footer class="site"><div class="wrap">
  <a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="help.html">Help</a><a href="contact.html">Contact</a>
  <p>&copy; 2026 QR Studio. QR Code is a registered trademark of DENSO WAVE INCORPORATED.</p>
</div></footer>`;

function page({ file, title, desc, body, head = '', foot = '', noindex = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${SITE}/${file}">`}
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
${ICONS}
<link rel="stylesheet" href="assets/style.css">
${head}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(file)}
<main id="main" class="wrap">
${body}
</main>
${footer}
${foot}
</body>
</html>
`;
}

const TYPES = [['url', 'Website', 'Link to any web page.'], ['text', 'Text', 'Share a note or message.'], ['wifi', 'Wi-Fi', 'Let guests join your network.'],
  ['vcard', 'Contact', 'Save a contact card to a phone.'], ['email', 'Email', 'Open a prefilled email.'], ['phone', 'Phone', 'Tap to call a number.'],
  ['sms', 'SMS', 'Prefill a text message.'], ['whatsapp', 'WhatsApp', 'Start a chat with a message.'], ['location', 'Location', 'Open a point on the map.'],
  ['event', 'Event', 'Add a date to a calendar.'], ['social', 'Social', 'Link to a profile.']];

const pages = [];

pages.push({
  file: 'index.html',
  title: 'Free QR Code Generator – No Signup, Private | QR Studio',
  desc: 'Create free, scannable QR codes in seconds: websites, Wi-Fi, contacts, WhatsApp and more. Customize colors, download PNG or SVG. Runs in your browser.',
  body: `<section class="hero">
  <div>
    <h1>QR codes that just scan.</h1>
    <p class="lead">Free and private: make a code for a link, Wi-Fi network, contact card or WhatsApp chat. Pick your colors, check the scan-quality warnings, and download PNG or SVG. Everything happens in your browser.</p>
    <p><a class="btn" href="generator.html">Create a QR code</a></p>
  </div>
  <figure class="hero-qr"><canvas id="heroQr" role="img" aria-label="Sample QR code that opens the QR Studio generator"></canvas><figcaption>This one opens the generator. Try it with your phone.</figcaption></figure>
</section>
<h2>Start with a type</h2>
<ul class="types">
${TYPES.map(t => `<li><a href="generator.html#${t[0]}"><h3>${t[1]}</h3><p>${t[2]}</p></a></li>`).join('\n')}
</ul>
<h2>Built to be reliable</h2>
<div class="why">
<div><h3>Private by design</h3><p>Codes are made on your device. What you type is never uploaded or stored.</p></div>
<div><h3>Print ready</h3><p>Crisp PNG, or SVG that scales to any size, with a safe quiet zone built in.</p></div>
<div><h3>Scan-quality checks</h3><p>Warnings for low contrast, dense codes and small margins appear before you print.</p></div>
<div><h3>Never expires</h3><p>Static codes carry the content itself, so they keep working with no account or server.</p></div>
</div>`,
  foot: `<script src="assets/qrcode.js"></script>
<script src="assets/render.js"></script>
<script>
(function(){
  var c=document.getElementById('heroQr');if(!c||!window.QrRender)return;
  var dark=matchMedia('(prefers-color-scheme: dark)').matches;
  var m=QrRender.make(location.origin+location.pathname.replace(/[^/]*$/,'')+'generator.html','M');
  QrRender.drawCanvas(c,m,{fg:dark?'#e6efec':'#12201d',bg:dark?'#0f1a18':'#e9f0ee',size:560,margin:3});
  if(dark){c.setAttribute('aria-label','Sample QR code (light on dark) that opens the QR Studio generator');}
})();
</script>`
});

pages.push({
  file: 'help.html',
  title: 'QR Code Help Center and FAQ | QR Studio',
  desc: 'Answers about static vs dynamic QR codes, printing, scan problems, Wi-Fi and vCard codes, and privacy.',
  body: `<h1>Help &amp; FAQ</h1>
<div class="prose">
<details><summary>What is a static QR code?</summary><p>A static QR code stores your content directly in the pattern. It works forever, needs no server and can't be edited after it is printed. Every code made here is static.</p></details>
<details><summary>What is a dynamic QR code?</summary><p>A dynamic code points to a short redirect link that can be changed later and can record scans. QR Studio doesn't offer dynamic codes yet.</p></details>
<details><summary>Is it free? Do I need an account?</summary><p>Yes, it is free and no account is needed.</p></details>
<details><summary>Is my data uploaded?</summary><p>No. Codes are generated in your browser. See the <a href="privacy.html">privacy policy</a>.</p></details>
<details><summary>PNG or SVG?</summary><p>Use PNG for screens, documents and social media. Use SVG for print and anything that must scale without blurring.</p></details>
<details><summary>My code won't scan. What should I check?</summary><ul><li>Dark code on a light background, with high contrast.</li><li>A quiet zone (blank border) of at least 4 modules.</li><li>Large enough: at least about 2&nbsp;cm (0.8&nbsp;in) when printed.</li><li>Shorter content gives a simpler code that's easier to scan.</li><li>Raise the error-correction level if the print may get scuffed.</li></ul></details>
<details><summary>How do Wi-Fi codes work?</summary><p>Phones that scan the code offer to join the network. The password is stored inside the code, so anyone who can scan it can connect.</p></details>
<details><summary>What phone number format should I use?</summary><p>Use international format with a leading +, for example +14155550123. WhatsApp codes require it.</p></details>
<details><summary>How much can a code hold?</summary><p>Up to a few thousand characters, but more content means a denser code that is harder to scan. We warn you when a code gets dense.</p></details>
<details><summary>Can I add a logo to my code?</summary><p>Not yet. Logos reduce scan reliability, so we plan to add them later with safety checks.</p></details>
<details><summary>Should I test before printing?</summary><p>Yes. Scan the exported file and the physical print with more than one phone before you print in volume.</p></details>
</div>`
});

pages.push({
  file: 'privacy.html', title: 'Privacy Policy | QR Studio',
  desc: 'How QR Studio handles your data: QR codes are generated in your browser and nothing you enter is uploaded or stored.',
  body: `<h1>Privacy Policy</h1>
<div class="prose">
<p class="note">Last updated: October 2026</p>
<h2>What we collect</h2>
<p>The generator runs entirely in your browser. The content you enter (links, text, Wi-Fi passwords, contact details and so on) is not sent to our servers and is not stored.</p>
<h2>Cookies and analytics</h2>
<p>This site does not set cookies or load third-party trackers or fonts. If we add privacy-friendly analytics in the future, this page will describe what is measured.</p>
<h2>Contacting us</h2>
<p>If you email us, we use your message and address only to reply. Messages are deleted when no longer needed.</p>
<h2>Your rights</h2>
<p>You can ask what we hold about you, or ask us to delete it, through the <a href="contact.html">contact page</a>.</p>
<p class="note">Template text: have it reviewed against the laws that apply to your business before launch.</p>
</div>`
});

pages.push({
  file: 'terms.html', title: 'Terms of Service | QR Studio', desc: "Terms of use for QR Studio's free QR code generator.",
  body: `<h1>Terms of Service</h1>
<div class="prose">
<p class="note">Last updated: October 2026</p>
<h2>Use of the service</h2>
<p>QR Studio is provided free and as is. You may use generated codes for personal or commercial purposes.</p>
<h2>Your content</h2>
<p>You are responsible for what your codes link to. Don't create codes that lead to illegal, deceptive, phishing or malicious content.</p>
<h2>No guarantee</h2>
<p>We do not guarantee that every code scans on every device. Always test codes, especially customized ones, before printing or publishing. Static codes cannot be changed once distributed.</p>
<h2>Liability</h2>
<p>To the extent permitted by law, we are not liable for losses arising from use of the service.</p>
<p class="note">Template text: have it reviewed by a legal professional before launch.</p>
</div>`
});

pages.push({
  file: 'contact.html', title: 'Contact and Support | QR Studio', desc: 'Get in touch with QR Studio for support, feedback or abuse reports.',
  body: `<h1>Contact &amp; support</h1>
<p class="lead">Questions, feedback, or a code that is being misused? Send us a message.</p>
<form id="cf" class="contact-form" novalidate>
  <label for="cn">Name</label><input id="cn" type="text" required autocomplete="name">
  <label for="ce">Your email</label><input id="ce" type="email" required autocomplete="email">
  <label for="cm">Message</label><textarea id="cm" required></textarea>
  <p class="err" id="cerr" role="alert"></p>
  <p style="margin-top:18px"><button class="btn" type="submit">Send message</button></p>
  <p class="note">This opens your email app addressed to <a id="addr" href="mailto:hello@example.com">hello@example.com</a>.</p>
</form>`,
  foot: `<script>
document.getElementById('cf').addEventListener('submit',function(e){
  e.preventDefault();
  var n=cn.value.trim(),m=ce.value.trim(),b=cm.value.trim(),er=document.getElementById('cerr');
  if(!n||!b||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(m)){er.textContent='Please enter your name, a valid email and a message.';return;}
  er.textContent='';
  var to=document.getElementById('addr').textContent;
  location.href='mailto:'+to+'?subject='+encodeURIComponent('QR Studio support from '+n)+'&body='+encodeURIComponent(b+'\\n\\nReply to: '+m);
});
</script>`
});

pages.push({
  file: '404.html', title: 'Page not found | QR Studio', desc: 'The page you requested could not be found.', noindex: true,
  body: `<h1>Page not found</h1>
<p class="lead">That page doesn't exist. Try the <a href="generator.html">QR code generator</a> or go <a href="index.html">home</a>.</p>`
});

for (const p of pages) fs.writeFileSync(path.join(root, p.file), page(p));

// Keep generator.html chrome in sync (its body is hand-written).
let g = fs.readFileSync(path.join(root, 'generator.html'), 'utf8');
g = g.replace(/<!--icons-->[\s\S]*?<!--\/icons-->\n?/, '');
g = g.replace('<link rel="stylesheet" href="assets/style.css">', ICONS + '\n<link rel="stylesheet" href="assets/style.css">');
g = g.replace(/<header class="site">[\s\S]*?<\/header>/, header('generator.html'));
g = g.replace(/<footer class="site">[\s\S]*?<\/footer>/, footer);
fs.writeFileSync(path.join(root, 'generator.html'), g);

fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['index.html', 'generator.html', 'help.html', 'contact.html', 'privacy.html', 'terms.html'].map(f => `  <url><loc>${SITE}/${f}</loc></url>`).join('\n')}
</urlset>
`);
console.log('pages built');
