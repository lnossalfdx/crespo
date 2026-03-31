# Deploy na VPS Ubuntu

## 1. Variaveis

Crie um `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://aanwxhunluzdsuojrrby.supabase.co
VITE_SUPABASE_ANON_KEY=COLE_SUA_ANON_KEY_AQUI
```

## 2. Banco Supabase

1. Abra `SQL Editor` no Supabase.
2. Rode o arquivo [supabase/schema.sql](./supabase/schema.sql).
3. Em `Database > Replication`, confirme que as tabelas do schema entraram no Realtime.

## 3. Build

```bash
npm install
npm run build
```

## 4. Publicacao no Ubuntu

```bash
sudo mkdir -p /var/www/responsyva-crm
sudo rsync -av --delete dist/ /var/www/responsyva-crm/dist/
```

## 5. Nginx

Copie [deploy/nginx.crm.responsyva-ai.com.br.conf](./deploy/nginx.crm.responsyva-ai.com.br.conf) para:

```bash
sudo cp deploy/nginx.crm.responsyva-ai.com.br.conf /etc/nginx/sites-available/responsyva-crm
sudo ln -s /etc/nginx/sites-available/responsyva-crm /etc/nginx/sites-enabled/responsyva-crm
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d crm.responsyva-ai.com.br
```

## 7. WebSocket / Realtime

O front nao precisa de proxy de websocket na VPS porque o Realtime vai direto para o Supabase:

```text
wss://aanwxhunluzdsuojrrby.supabase.co/realtime/v1/websocket
```

Com `supabase-js`, essa conexao e aberta automaticamente quando o app assina canais Realtime.
