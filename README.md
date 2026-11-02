# Cálculo Integral desde cero

App web (React + TypeScript + Vite, 100 % estática) para preparar el examen de Cálculo Integral:
taller resuelto línea por línea, variantes ilimitadas, gráficas interactivas y guía de la Casio fx-570ES PLUS.
Todas las fórmulas se muestran en LaTeX (KaTeX).

## Estado

**Etapa 1 (lista):** taller resuelto (9 ejercicios), visor de pasos tipo depurador (líneas, breakpoints, variables),
gráficas interactivas (área, rectángulo `dx`, suma de rectángulos, integral definida), práctica con 4 variantes por
ejercicio (2 gemelas + 2 retos con trigonometría y π) y guía de la calculadora.

**Pendiente:** agente de IA (OpenAI / opencode Go), quiz guiado, modo examen, cheatsheet explicado, álgebra desde cero, PWA offline.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # verifica con cálculo numérico que TODAS las variantes son matemáticamente correctas
npm run build    # genera dist/
```

## Publicar en GitHub Pages

1. Crea un repositorio vacío en GitHub (por ejemplo `calculo-integral-app`).
2. Desde esta carpeta:

```bash
git branch -M main
git remote add origin https://github.com/<tu-usuario>/calculo-integral-app.git
git push -u origin main
```

3. En GitHub: **Settings → Pages → Build and deployment → Source: “GitHub Actions”**.
4. El workflow `.github/workflows/deploy.yml` corre las pruebas, construye y publica.
   La URL será `https://<tu-usuario>.github.io/calculo-integral-app/`.

La app usa rutas con `#` y `base: './'`, así que funciona en cualquier nombre de repositorio.
