# Logos officiels des organismes

Déposez ici le logo officiel d'un organisme, fourni par l'établissement ou utilisé avec son accord
(SVG de préférence, sinon PNG carré d'au moins 128 × 128 px, fond transparent), nommé d'après son alias :
`inphb.svg`, `ena.svg`, `esatic.png`…

Puis associez-le à l'organisme (backend) :

    npm run catalog -- set-logo inphb /organismes/inphb.svg

Sans logo renseigné (ou si le fichier est introuvable), le site affiche automatiquement un monogramme
aux couleurs de Fatafalta. `npm run catalog -- set-logo inphb -` revient au monogramme.
