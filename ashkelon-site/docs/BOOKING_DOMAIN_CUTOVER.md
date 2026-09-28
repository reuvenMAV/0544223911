# booking.mavash.net → Ashkelon

Production canonical URL: `https://booking.mavash.net`

## Status
- Vercel project `ashkelon-site` has domain `booking.mavash.net` (pending TXT verify).
- `NEXT_PUBLIC_SITE_URL=https://booking.mavash.net` set in Vercel (all environments).
- DNS today: `booking.mavash.net` A → Oracle `129.159.138.4` (nginx currently reverse-proxies Forever).

## Cutover options

### A) Nginx on Oracle (keeps current A record)
On Mac (`ssh mavash`):

```bash
ssh mavash bash <<'EOF'
set -euo pipefail
CONF=$(sudo grep -RIl 'server_name.*booking\.mavash\.net' /etc/nginx | head -1)
sudo cp "$CONF" "$CONF.bak.forever.$(date +%s)"
sudo sed -i -E 's|proxy_pass[[:space:]]+https?://[^;]+;|proxy_pass https://ashkelon-site.vercel.app;|g' "$CONF"
if ! sudo grep -q 'proxy_set_header Host ashkelon-site.vercel.app' "$CONF"; then
  sudo sed -i '/proxy_pass https:\/\/ashkelon-site.vercel.app;/a\        proxy_ssl_server_name on;\n        proxy_set_header Host ashkelon-site.vercel.app;\n        proxy_set_header X-Forwarded-Host booking.mavash.net;\n        proxy_set_header X-Forwarded-Proto $scheme;' "$CONF"
fi
sudo nginx -t && sudo systemctl reload nginx
curl -sL https://booking.mavash.net/ | grep -o '<title>[^<]*</title>'
EOF
```

### B) DNS → Vercel directly
1. TXT `_vercel.mavash.net` = `vc-domain-verify=booking.mavash.net,3fba2f5740d9844aa2f9`
2. Replace booking A record with CNAME `booking` → `cname.vercel-dns.com`
