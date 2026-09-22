# WellScope Engineering — ALPHA 0.2

## Démarrage (Windows)
Décompresser le ZIP **en entier** puis double-cliquer sur `OUVRIR_WELLSCOPE.cmd`, ou ouvrir `app/index.html` dans Chrome ou Edge. Aucun serveur, paquet ou accès internet requis. Le ZIP n'inclut pas les exécutables originaux WellScan ni la documentation privée fournie.

## Fonctions réellement actives
- Vue 3D projective interactive des puits, rotation/zoom, stations synchronisées, vue en plan, position du BHA **schématique**.
- Surveys personnalisables/import CSV ; minimum curvature et N/E/TVD/DLS (repère local, pas de projection géodésique) avec validation des entrées.
- Puits voisin importable ; proximité centre à centre par station et projection sur segments du voisin. **Le minimum échantillonné n'est pas une garantie de distance minimale continue entre courbes réelles.**
- Dessin d'enveloppes hypothétiques : σ manuels non propagés et projection de cercles horizontalement ; **ce ne sont pas des ellipsoïdes d'incertitude ISCWSA** malgré l'étiquette de la vue qui reprend le vocabulaire visuel à remplacer. Aucun facteur de séparation normatif, aucune probabilité de collision, aucun feu vert de forage.
- Train assemblé bit→surface : longueur/OD/ID/masse linéique ; les longueurs et masses alimentent le calcul axial.
- Estimation de hookload statique/pickup/slackoff par **soft-string simplifié** et poids immergé ; frottement µN approximatif, sans stiffness, torque, buckling, limites de hookload ou vérification fabricant. Le terme « Torque » est dans le nom du workspace uniquement ; **la partie couple n'est pas calculée**.
- Rapport résumé via « Imprimer / PDF » (impression navigateur), export JSON du cas et CSV des surveys.

## Limites critiques et validation
**Logiciel de démonstration et pré-analyse pédagogique seulement — non utilisable pour les décisions opérationnelles, anticollision ou acceptation de charges.** Évaluer avec des modèles approuvés, les spécifications fabricants et les procédures de puits. Les valeurs de démonstration (y compris OD/ID, σ, coefficients, capacités) sont entièrement synthétiques. Aucun seuil de risque ou verdict « sûr / dangereux » n'est émis.

Tests unitaires locaux : `node tests/test_engine.js` si Node est disponible ; le logiciel n'a pas besoin de Node pour s'exécuter. Les tests confirment quelques invariants mathématiques simples, **pas une validation physique par cas de référence certifiés**.

## Recherche effectuée pour cette version
- Archive Windows `STABLE-WellScan-build2245-Win64 (1).zip` : documentation HTML et tutoriels 2 (case studies), 3 (directional), 4 (dynamics), 5 (torque and drag) et 6 (survey). Les binaires ne sont ni exécutés ni décompilés ni redistribués.
- Drive : 102a Introduction to BHA Modeling ; 103a/b/c TnDnB ; 104a/b Dynamics/Modal ; 08 TDS S&S mitigation ; SPE 102088 BHA Sag ; documents de préparation de trajectoires, et identification de dossiers WellView.
- La recherche `HNP` n'a pas permis d'identifier avec certitude un corpus nommé HNP correspondant. Aucun rapport WellView complet ni rapports WellScan de référence n'ont été intégralement analysés ; il faut les qualifier avant d'affirmer une équivalence fonctionnelle.

Les ressources privées consultées sont **référencées**, sans recopie ni inclusion de documents protégés. Consulter `research/ETAT_SOURCES_ET_MODELES.md` pour l'inventaire des lacunes.
