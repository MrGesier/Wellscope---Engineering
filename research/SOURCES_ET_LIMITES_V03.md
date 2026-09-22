# WellScope Engineering Alpha 0.3 — sources, science, modèle et lacunes

Ce document sépare (A) les connaissances apportées par les sources, (B) les fonctions effectivement codées et (C) les modèles encore absents. Les rapports privés n'ont pas été reproduits dans le ZIP ; les noms ci-dessous sont uniquement des pointeurs pour l'utilisateur.

## A — Enseignements explicitement lus dans les documents fournis

- `M16-112 DrillScan Software Lessons Learnt Advanced Tutorial.pdf`, p. 9–14 : BHA étudié comme système bit-rock-BHA ; influence de la géométrie du trépan, de la rigidité et des stabilisateurs, du mode d'entraînement (motor/RSS), de la formation et du hole overgauge. La p. 10 distingue entre autres le modèle RSS push-the-bit imposant une force et la commande par déplacement. La p. 11 met en garde contre certaines limites et caractéristiques du modèle historique : celles-ci ne sont **pas** des limites transférables sans preuve à notre application.
- Même document, p. 15–17 : pré-analyse et sensibilités TFO, activation RSS, WOB, OVG, UCS ; les sections à faible inclinaison et les paramètres supposés de formation requièrent une prudence particulière. p. 18–22 : post-analyse et fitting segmentés, nécessité de QA/QC des logs et des modes de steering ; on ne peut pas simplement moyenner des TFO en mode automatique. p. 23–24 : prédiction de trajectoire ; limites de contact pads/overgauge documentées dans l'application étudiée.
- Même document, p. 32–35 : modules Torque & Drag soft-string/stiff-string, vibration modale, sag, micro-DLS et pistes bibliographiques pour les modèles absents. Ces descriptions ne donnent **pas** un jeu suffisant de cas de référence pour certifier un nouveau solveur.
- `BIL4-11 Drillscan vs Baker Hughes directional study.PDF`, p. 2–5 : données explicites de BHA, WOB, boue, friction et hypothèses de modélisation ; p. 8–13 : diagrammes build vs turn ; p. 22–25 : résultats axiaux/torsionnels comparables entre logiciels, divergences latérales mises en relation avec la modélisation des contacts de paroi ; p. 27–31 : exemples de tension, side force, bending stress et visualisation 3D. Il s'agit de comparaisons historiques, pas de valeurs à généraliser à tous les puits.
- `DrillScan_Publication_List.pdf`, p. 1–2 : références SPE 98965 (mécanique 3D), SPE 102850 (buckling), SPE 102088 (BHA sag), SPE 110432 (BHA post-analysis), SPE 151283 (steerability), SPE 184074 (micro doglegs). Leurs titres ne signifient pas que les algorithmes ont été entièrement reconstitués.
- `Drillscan simulation for BHA Rev5.msg` : document de travail transmis en complément, mais ses hypothèses constructeur et ses pièces jointes n'ont **pas** été transformées en modèle validé. Les bibliothèques `DrillScan.*.bpl`, DLL et exécutables restent hors exécution et hors distribution ; leur présence ne constitue pas un accès au code source du solveur.

## B — Dernière vérification externe ciblée

- ISCWSA, `Error Model Documentation`, Revision 5 : https://www.iscwsa.net/error-model-documentation/ . La documentation inclut la définition mathématique, des jeux de référence et une recommandation spécifique pour le traitement des sidetrack wellbore clearance scans. **Notre alpha ne prétend pas implémenter la Rev5.**
- ISCWSA, `Error Model Sub-Committee` : https://www.iscwsa.net/committees/error-model/ . Selon le comité, les modèles d'erreurs des instruments et leurs paramètres doivent être justifiés et les valeurs spécifiques aux outils proviennent normalement de leurs fournisseurs. Nous n'en possédons pas ici pour un puits opérationnel.
- ISCWSA, `Collision Avoidance Sub-Committee` : https://www.iscwsa.net/committees/collision-avoidance/ . Ne pas ramener l'acceptation à un seul facteur de séparation ou à un gap visuel arbitraire.

## C — Implémentation Alpha 0.3

1. `engine.js` : minimum curvature et screening géométrique, estimation axiale simplifiée préexistante dans Alpha 0.2. L'interpolation linéaire des positions de stations n'est pas une reconstruction continue du vrai puits ; une zone locale de micro-dogleg peut manquer.
2. `enhanced.js` : local tangent T(N,E,TVD), deux axes orthonormés du plan transverse. Une matrice supposée `diag(sigma_N², sigma_E², sigma_TVD²)` est projetée dans le plan ; ses deux valeurs propres et l'angle donnent une ellipse de niveau radial `k=2`. Les σ sont **les valeurs entrées manuellement** ; pas d'erreur instrumentale propagée ni de corrélation physique. La forme géométrique n'est pas une EOU ISCWSA et n'entre pas dans le calcul d'une décision anticollision.
3. Sidetrack : jeu de données synthétiques parent/branche avec KOP 2 000 mMD. Le parent et le sidetrack sont collocaux jusqu'au KOP ; la comparaison s'applique uniquement au tronçon de branche au-delà de la zone de départ, et **ne formalise pas** le traitement standard d'un sidetrack.
4. Graphes T&D : découpages pétroliers *propres à ce jeu de démo*, selon des profondeurs MD fixes. Ils ne peuvent pas être réutilisés tels quels pour une autre géométrie importée : le découpage métier de puits serait à dériver d'un programme de trajectoire, des surveys et des opérations.
5. Bibliothèque BHA : les icônes vectorielles originales sont pédagogiques ; dimensions et masses des 11 modèles d'insertion sont **fictives** et à éditer. Les fonctions propres au motor, RSS, pad, jar, cutter ne sont pas simulées.

## D — Prochaine validation requise

- Import géodésique et survey tool codes approuvés, covariance 3D et covariance inter-puits en fonction de profondeur, politique anticollision du projet, balayage continu et tests des trois puits de référence ISCWSA.
- Moteur T&D stiff-string validé, contact tool joints / stabilisateurs, load cases et enveloppes constructeur : pipe body, connexion, topdrive, hook, hoisting capacity, MOP, stress, buckling et couple. Benchmarks analytiques + cas de terrain approuvés.
- Modèle BHA coupling bit-rock, motor/RSS, pré/post analyse par run segment, effet lithologie, BHA sag et trajectoire prédite, et séparation explicite des modes auto de steering.
- Modes propres sous contacts et conditions aux limites documentés, confrontation aux courbes comparatives et données downhole ; detection stick-slip et mitigation uniquement après validation indépendante.
- Modèle de rapport industriel signé (scope, data QA/QC, assumptions, calibration, version, résultats, limites, revue d'ingénierie).

**Ne pas utiliser les chiffres synthétiques ni cette alpha pour les décisions de forage.**
