# i18n — Piedra a Piedra

## Editar textos

Archivos JSON (una clave = un string):

- `locales/es.json` — español
- `locales/en.json` — inglés neutro

Claves con puntos: `landing.heroBody`, `common.login`, …

Interpolación: `"sent": "Enviado a {{email}}"` → `t("platformInvite.sent", { email })`

## Uso en componentes

```jsx
import { useI18n } from "../i18n";

const { t, lang, setLang } = useI18n();
t("common.save");
setLang("en"); // guarda en localStorage `piedra-lang`
```

## Detección automática

Orden en `detect.js`:

1. Preferencia manual (`localStorage.piedra-lang`)
2. Idiomas del navegador (`es*` → español)
3. Zona horaria España / LATAM → español
4. Por defecto → inglés

No usa GeoIP (privacidad + sin API). País se infiere de idioma del SO y timezone.

## Añadir un idioma

1. Crear `locales/xx.json` (copia de `en.json`)
2. Importar en `index.jsx` y añadir a `catalogs`
3. Añadir a `SUPPORTED_LANGS` en `detect.js`
4. Botón en `LanguageSwitcher.jsx`
