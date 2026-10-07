/* Load this script from the marketing gallery to export any local SVG as PNG. */
(() => {
  'use strict';
  async function exportPNG(link) {
    const source = link.getAttribute('href');
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    // Intentionally no background fill: logo exports retain their alpha channel.
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable in this browser.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG export failed.');
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href = url;
    download.download = source.split('/').pop().replace(/\.svg(?:\?.*)?$/i, '.png');
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.querySelectorAll('a[href$=".svg"][download]').forEach(link => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Download PNG';
    button.style.cssText = 'margin:8px;padding:10px 14px;border:1px solid #872bff;border-radius:8px;background:#191322;color:#fff;cursor:pointer';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Exporting…';
      try {
        await exportPNG(link);
        button.textContent = 'Download PNG';
      } catch (error) {
        button.textContent = 'Retry PNG';
        alert('Could not export PNG. Try serving this folder over localhost. ' + error.message);
      } finally {
        button.disabled = false;
      }
    });
    link.after(button);
  });
})();
