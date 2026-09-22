# WellScope Engineering — ALPHA 0.3 · Démo multi-puits

## Démarrage Windows

1. Décompresser **tout** le ZIP dans un dossier normal (ne pas exécuter depuis l'aperçu du ZIP).
2. Double-cliquer sur `OUVRIR_WELLSCOPE.cmd`. Windows ouvre `app/index.html` dans votre navigateur par défaut. Sinon, ouvrir `app/index.html` dans Edge ou Chrome.
3. Aucun serveur, compte, clé API ou installation de paquet n'est requis. Les dépendances front-end sont incluses sous forme de fichiers texte locaux ; pas d'appel réseau. Les liens vers les sources externes sont facultatifs.

## Parcours de démonstration conseillé (10 minutes)

1. **Vue puits 3D** : faire glisser pour changer l'orientation et utiliser la molette pour zoomer. Le puits principal, l'Offset A, l'Offset B et le sidetrack sont préchargés. Le sidetrack commence à KOP = 2 000 mMD (exercice synthétique).
2. **Anticollision** : tester les trois jeux de positions « Offset proche », « Offset éloigné », « Offset plus proche ». La vue 3D affiche les traces et les *contours 2σ synthétiques*, qui sont physiquement petits à l'échelle de 3,4 km. Juste en dessous, la **coupe transverse zoomée** rend les ellipses visibles à échelle locale. Choisir Offset A, Offset B ou Sidetrack dans le sélecteur et faire glisser le curseur de profondeur. À partir du KOP, la branche sidetrack et le parent divergent. Avant KOP, il s'agit du même trou : ne pas compter cette partie comme une collision entre puits indépendants.
3. **Import multi-puits** : importer les CSV `demo_data/*.csv` dans les champs `Reference`, `Offset A`, `Offset B`, `Sidetrack` correspondants. Le format CSV est `md,inc,azi` avec MD en mètres, angles en degrés. Entrer les N/E initiaux correspondants. Pour le sidetrack, fournir les stations du parent jusqu'à **2 000 mMD** puis celles de la nouvelle branche. Le point KOP doit exister dans les deux CSV. Le repère est local, non géodésique.
4. **Torque & Drag** : sélectionner une section (« Vertical », « KOP », « Build », « Tangent / Hold », « Landing », « Lateral ») ; examiner la vue 3D de charge axiale, les valeurs de pickup, slackoff et static, puis faire varier le coefficient de frottement ou la boue et cliquer sur `Recalculer`.
5. **BHA Builder** : sélectionner une des 11 familles de pictogrammes (bit PDC/tricone, motor, RSS, stab, MWD, NMDC, HWDP, DP, jar, reamer). L'élément est inséré avant le DP ; vérifier sa position, son nom, ses cotes et ses masses dans le tableau, puis `Appliquer la composition`.
6. **Rapport & sources** : consulter le résumé, exporter le projet JSON ou imprimer depuis le navigateur. Les trois exercices complets de départ se trouvent sous `demo_data/*.json` : bouton `Import projet`.

## Moteurs présents et statut exact

| Module | Fonction réellement présente | Statut et limites |
|---|---|---|
| Surveys et 3D | Minimum Curvature station à station, N/E/TVD/DLS, projection 3D interactive canvas 2D. | Modèle local, stations synthétiques, sans géodésie, validation mathématique élémentaire uniquement. |
| Anticollision | Projection nominale sur les segments de polyline voisine, distance centre-à-centre échantillonnée, gap **physique nominal** avec rayons saisis, choix des puits A/B et branche sidetrack. | Ni minimum continu garanti, ni covariance instrumentale propagée, ni collision probability, ni facteur de séparation ISCWSA. |
| Coupe elliptique | Forme géométrique des ellipses 2σ par projection d'une matrice **diagonale supposée** N/E/TVD sur un plan transverse de la référence ; l'angle et les demi-axes résultent de la diagonalisation 2×2. | Les 6 sigmas sont **arbitraires et modifiables**, indépendants de la profondeur, aucune corrélation entre puits ou instrument. 2σ n'est **pas** une garantie de confiance de la position. Aucune distance entre ellipses validée. Ne pas assimiler aux EOU ISCWSA. |
| Torque & Drag | Poids apparent par longueur, marche arrière bit → surface sur segments de survey, chargement axial / pickup / slackoff / static selon un modèle **soft-string simplifié**, graphes par section. | Ni couple de surface ou moteur, ni stiff-string, joints/contacts effectifs, ni flambage, stress, hookload admissible ou marge de sécurité. Les capacités saisies restent **informatives et non approuvées**. |
| BHA | Bibliothèque visuelle originale de 11 familles, table géométrie/longueurs/masses, insertion et modifications, masse prise en compte dans le modèle axial. | N'inclut aucun véritable solveur directionnel bit-rock/BHA ni schéma mécanique constructeur ni limite de pièce. |
| Rapport | Synthèse de cas, exports CSV/JSON, impression via navigateur. | Draft pédagogique ; pas un rapport d'ingénierie approuvé. |

**Ne jamais utiliser cette version pour décider de rapprocher un puits voisin, approuver une trajectoire, définir des paramètres de manœuvre ou accepter une charge réelle.** Seule une revue d'ingénierie avec modèles validés, positionnement et politiques anticollision approuvées et données fabricant du puits concerné peut servir à ces décisions.

## Sources consultées / non intégrées

- M16-112, *DrillScan Software Lessons Learnt & Advanced Tutorial*, notamment p. 9–24 : description des BHA, workflow Pre/Post Analysis et limites ; p. 33–34 : périmètre des modules et liste des publications ; annexes : présentation des études de puits.
- *BIL4-11 DrillScan vs Baker Hughes directional study*, notamment p. 22–25 : divergence des résultats latéraux liée au contact avec la paroi ; p. 27–31 : tension, side force, stress de flexion et vue 3D comparatifs.
- `DrillScan_Publication_List.pdf` : bibliographie scientifique pour les futures implémentations.
- Documentation publique ISCWSA Rev5 / définition du modèle d'erreurs et procédures de traitement des sidetracks : https://www.iscwsa.net/error-model-documentation/ . Cette alpha n'implémente **aucune** des formules de ces documents normatifs.
- Archive WellScan fournie et bibliothèque BPL : aucune dépendance, extraction de code source ni exécution des exécutables propriétaires. Bibliothèques et PDF utilisateur non inclus dans le ZIP.

Consulter `research/SOURCES_ET_LIMITES_V03.md` pour la traçabilité détaillée.

## Tests

Dans le dossier décompressé, avec Node installé de manière facultative : `node tests/test_engine.js` puis `node tests/test_v03.js`. L'application ne nécessite pas Node. Les captures `screenshots/` ont été prises sur l'interface réelle avec un navigateur automatisé, après insertion de ses scripts locaux. Cette vérification ne remplace pas un essai du lanceur Windows sur votre PC ni une validation de calculs par cas industriels certifiés.
