# SSoN project website

Project website for **Same Space or Not (SSoN)**, a benchmark for spatial intelligence through cross-view contradictions and part of the AI Vision Exam series.

[Homepage](https://sson.aisexam.com/) · [Code](https://github.com/sson-benchmark/SSoN) · [Dataset](https://huggingface.co/datasets/HuiziCao/SSoN) · [Checkpoints](https://huggingface.co/HuiziCao/SSoN-Qwen2.5-VL-7B-LoRA)

**Paper (arXiv):** Coming soon.

## Preview

Open `index.html` in a browser. The website is static and requires no installation or build step.

## Deploy with GitHub Pages

1. Upload the contents of this folder to the root of [sson-benchmark/sson-benchmark.github.io](https://github.com/sson-benchmark/sson-benchmark.github.io).
2. In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/(root)**.
3. Set **Custom domain** to `sson.aisexam.com`.
4. In the DNS settings for `aisexam.com`, add a **CNAME** record with name `sson` and value `sson-benchmark.github.io`.
5. Once DNS and the certificate are ready, enable **Enforce HTTPS**.

## Content and maintenance

- `index.html`: page content and resource buttons.
- `styles.css`, `findings.css`, `motion.css`: layout and visual styles.
- `app.js`, `findings.js`, `motion.js`: interactive examples, results and animation.
- `site-config.js`: project and resource URLs.
- `site-data.js`, `data/`: example metadata and benchmark results.
- `assets/`: logos, figures and question images.

To activate the paper button, add the arXiv URL to `links.paper` in `site-config.js`. Update the citation in `index.html` when it is available.
