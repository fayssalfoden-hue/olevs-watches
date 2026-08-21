/* OLEVS / AETERNUS design tokens — extracted verbatim from the supplied Stitch
   screens. Loaded after the Tailwind CDN script on every page so all four pages
   share one definition of the theme instead of four hand-copies that drift. */
tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "surface-variant": "#e4e2e2",
                      "inverse-surface": "#303031",
                      "surface": "#fbf9f8",
                      "surface-container-low": "#f5f3f3",
                      "inverse-primary": "#e6c180",
                      "background": "#fbf9f8",
                      "on-tertiary": "#ffffff",
                      "on-tertiary-fixed": "#1b1c19",
                      "on-primary-container": "#503904",
                      "tertiary-container": "#a9a8a4",
                      "primary-fixed-dim": "#e6c180",
                      "surface-container-high": "#e9e8e7",
                      "secondary": "#5f5e5e",
                      "secondary-fixed": "#e5e2e1",
                      "tertiary-fixed-dim": "#c8c6c2",
                      "primary": "#755a24",
                      "surface-dim": "#dbdad9",
                      "on-error-container": "#93000a",
                      "primary-container": "#c5a365",
                      "secondary-fixed-dim": "#c8c6c5",
                      "secondary-container": "#e2dfde",
                      "surface-container": "#efeded",
                      "outline": "#7f7668",
                      "inverse-on-surface": "#f2f0f0",
                      "on-tertiary-container": "#3d3d3a",
                      "on-secondary-fixed": "#1c1b1b",
                      "surface-bright": "#fbf9f8",
                      "on-secondary": "#ffffff",
                      "on-secondary-fixed-variant": "#474746",
                      "surface-tint": "#755a24",
                      "on-primary-fixed": "#271900",
                      "on-surface-variant": "#4d463a",
                      "on-error": "#ffffff",
                      "tertiary-fixed": "#e4e2dd",
                      "error": "#ba1a1a",
                      "on-surface": "#1b1c1c",
                      "primary-fixed": "#ffdea6",
                      "error-container": "#ffdad6",
                      "tertiary": "#5e5e5b",
                      "on-primary-fixed-variant": "#5b430d",
                      "surface-container-lowest": "#ffffff",
                      "outline-variant": "#d1c5b5",
                      "on-secondary-container": "#636262",
                      "on-primary": "#ffffff",
                      "on-tertiary-fixed-variant": "#474744",
                      "surface-container-highest": "#e4e2e2",
                      "on-background": "#1b1c1c"
              },
              "borderRadius": {
                      "DEFAULT": "0.25rem",
                      "lg": "0.5rem",
                      "xl": "0.75rem",
                      "full": "9999px"
              },
              "spacing": {
                      "gutter": "32px",
                      "margin-desktop": "64px",
                      "section-gap": "120px",
                      "unit": "8px",
                      "margin-mobile": "20px",
                      "container-max": "1280px"
              },
              "fontFamily": {
                      "headline-lg-mobile": [
                              "Libre Caslon Text"
                      ],
                      "headline-md": [
                              "Libre Caslon Text"
                      ],
                      "label-caps": [
                              "Hanken Grotesk"
                      ],
                      "display-lg": [
                              "Libre Caslon Text"
                      ],
                      "body-lg": [
                              "Hanken Grotesk"
                      ],
                      "headline-lg": [
                              "Libre Caslon Text"
                      ],
                      "price-display": [
                              "Hanken Grotesk"
                      ],
                      "body-md": [
                              "Hanken Grotesk"
                      ]
              },
              "fontSize": {
                      "headline-lg-mobile": [
                              "32px",
                              {
                                      "lineHeight": "1.2",
                                      "fontWeight": "400"
                              }
                      ],
                      "headline-md": [
                              "28px",
                              {
                                      "lineHeight": "1.3",
                                      "fontWeight": "400"
                              }
                      ],
                      "label-caps": [
                              "12px",
                              {
                                      "lineHeight": "1.2",
                                      "letterSpacing": "0.15em",
                                      "fontWeight": "600"
                              }
                      ],
                      "display-lg": [
                              "64px",
                              {
                                      "lineHeight": "1.1",
                                      "letterSpacing": "-0.02em",
                                      "fontWeight": "400"
                              }
                      ],
                      "body-lg": [
                              "18px",
                              {
                                      "lineHeight": "1.6",
                                      "fontWeight": "400"
                              }
                      ],
                      "headline-lg": [
                              "40px",
                              {
                                      "lineHeight": "1.2",
                                      "fontWeight": "400"
                              }
                      ],
                      "price-display": [
                              "20px",
                              {
                                      "lineHeight": "1",
                                      "letterSpacing": "0.05em",
                                      "fontWeight": "500"
                              }
                      ],
                      "body-md": [
                              "16px",
                              {
                                      "lineHeight": "1.6",
                                      "fontWeight": "400"
                              }
                      ]
              }
      },
          },
        }

/* The dashboard's inventory table is laid out on a THIRTEEN column grid:
   image 1 + name 4 + description 3 + price 2 + stock 2 + actions 1 = 13.
   Tailwind's default gridTemplateColumns scale stops at 12, so `grid-cols-13`
   as written in the supplied screen emits no rule at all — the browser then
   auto-fits four columns and the six cells wrap onto separate lines, which is
   why every product rendered as a tall stack instead of a table row.
   Registering the scale value restores the layout the design intended without
   touching a single class in the markup. */
tailwind.config.theme.extend.gridTemplateColumns = {
  '13': 'repeat(13, minmax(0, 1fr))',
};
