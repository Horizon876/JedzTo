# JedzTo — lokalne środowisko dev (backend + telefon przez tunel)

Ten dokument opisuje **jedyny sprawdzony sposób** odpalenia całego stosu lokalnie
i podłączenia telefonu (Expo Go) przez internet, gdy telefon nie jest w tej samej
sieci Wi-Fi co komputer.

## Szybki start

```bash
./start-dev.sh
```

Skrypt **zostaje w pierwszym planie** (czeka na wszystkie procesy) — zatrzymujesz
całość jednym `Ctrl+C`. Jeśli chcesz go odpalić w tle: `nohup ./start-dev.sh >
/tmp/jedzto-logs/stack.log 2>&1 &`.

Skrypt sam:
1. Zabija stare procesy (API/Metro/ngrok/proxy) na portach 8001/8081/8090.
2. Startuje `jedzto-local-api` (GraphQL + WS) na porcie **8001**.
3. Startuje `dev-tunnel-proxy.js` na porcie **8090** — łączy API (8001) i Metro
   (8081) pod jednym portem, bo darmowy ngrok daje tylko **jeden** stały adres.
4. Startuje `ngrok http 8090` i odczytuje publiczny URL.
5. Startuje Expo Metro z `EXPO_OFFLINE=1` + `EXPO_PACKAGER_PROXY_URL=<ngrok url>`.
6. Generuje kod QR (`enatega-multivendor-app/.tmp/expo-qr.png`) z linkiem `exp://...`.

Logi: `/tmp/jedzto-logs/{api,proxy,ngrok,expo}.log`

## Dlaczego akurat tak (ważne, żeby nie wracać do ślepych zaułków)

- **`expo start --tunnel`** (wbudowany tunel EAS, domena `exp.direct`) **nie działa**
  bez zalogowania — prawdziwy telefon wysyła nagłówek `expo-expect-signature`,
  co wymusza pobranie certyfikatu code-signing z serwerów EAS (`CommandError:
  Input is required... EXPO_TOKEN`). Dlatego **nie używamy `--tunnel`**.
- **Dwa osobne tunele ngrok** (jeden na Metro 8081, drugi na API 8001) **nie
  działają** na darmowym koncie — konto ma jeden stały hostname (`*.ngrok-free.dev`)
  i każdy nowy tunel go nadpisuje. Stąd `dev-tunnel-proxy.js`, który łączy oba
  serwisy pod jednym portem (routing po ścieżce: `/graphql`, `/health`,
  `/playground` → API 8001; wszystko inne → Metro 8081).
- **`EXPO_PACKAGER_PROXY_URL`** — niedokumentowana, ale wspierana zmienna
  środowiskowa Expo CLI (`@expo/cli/build/src/start/server/UrlCreator.js`) do
  wskazania, że serwer stoi za reverse proxy/tunelem. Bez niej manifest Expo
  Go zgłasza błędny host (np. z dopisanym `:8081`, którego tunel nie obsługuje).
- **`EXPO_OFFLINE=1`** — pomija próbę pobrania dev-certyfikatu code-signing z EAS
  (`getExpoRootDevelopmentCodeSigningInfoAsync` w `codesigning.js`), która inaczej
  wymaga zalogowanego konta Expo w środowisku non-interactive.

## Ręczne odpalenie (jeśli nie chcesz skryptu)

```bash
# 1) API
cd jedzto-local-api && node server.js &

# 2) Combined proxy (Metro 8081 + API 8001 -> jeden port 8090)
cd .. && node dev-tunnel-proxy.js &

# 3) ngrok na porcie proxy
ngrok http 8090 &
# odczytaj URL: curl -s http://localhost:4040/api/tunnels

# 4) Metro z poprawnym hostem i bez logowania EAS
cd enatega-multivendor-app
EXPO_OFFLINE=1 EXPO_PACKAGER_PROXY_URL="https://<TWÓJ-TUNEL>.ngrok-free.dev" npx expo start --clear
```

Link do zeskanowania w Expo Go: `exp://<TWÓJ-TUNEL>.ngrok-free.dev`
(czyli ten sam host co ngrok, tylko ze schematem `exp://` zamiast `https://`).

## Konta demo (seed)

| Rola | Email | Hasło |
|---|---|---|
| SUPER_ADMIN | `admin@jedzto.local` | `admin1234` |
| RESTAURANT_OWNER | `owner1@jedzto.local` | `owner1234` |
| RESTAURANT_OWNER | `owner2@jedzto.local` | `owner1234` |
| CUSTOMER | `demo@jedzto.local` | `demo1234` |
| OTP (wszystkie konta) | — | `123456` |

## Jeśli telefon jest w tej samej sieci Wi-Fi co komputer

Tunel nie jest wymagany — można ustawić `EXPO_PUBLIC_JEDZTO_API_HOST` na adres
LAN komputera w `enatega-multivendor-app/environment.config.js` i odpalić Metro
normalnie (`REACT_NATIVE_PACKAGER_HOSTNAME=<LAN IP> npx expo start`). W praktyce
jednak tunel działa niezależnie od sieci, więc jest to bezpieczniejsza domyślna
opcja.
