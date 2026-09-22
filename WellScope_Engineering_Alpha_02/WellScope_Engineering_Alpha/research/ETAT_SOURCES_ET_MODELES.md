# Sources et grille de qualification — ALPHA 0.2

| Source | Constat concret | Implémentation ALPHA | Reste à valider |
|---|---|---|---|
| WellScan Tutorial 5, Torque and drag, pp. 4–5 | Soft-string : petits éléments transférant traction/compression/torsion sans moment fléchissant ; intégration fond → surface. Stiff-string : rigidité flexionnelle et jeux radiaux. ABIS : contact 3D inconnu a priori. | Schéma de calcul axial segmenté et poids apparent, force normale approximée | Vérifier formulation originale précise, méthodes friction/contact, conditions limites, cas de référence et torque ; le modèle livré n'est pas ABIS. |
| WellScan Tutorial 3, Directional | BHA / bit / formation / géométrie et opérations couplés, directional pre-analysis et post-analysis | Données BHA + surveys seulement | Modèle beam/contact, bit walk/steerability, build/turn response, sensitivities. |
| WellScan Tutorial 6, Survey | Correction sag et reconstruction | Minimum curvature sans sag | Sélection error model validé, sag réel, matrice covariance et corrélations. |
| WellScan aide embarquée : WPDAnticollisionIntro, WPDAnticollisionDataInputResults, WPDAnticollisionScience | Référence et offsets, centre à centre, semi-axes ellipses, highside, séparation, etc. | Centre à centre par points référence vs projection 3D sur segments offset ; rayons et σ hypothétiques | Références géodésiques, distance extrême de deux courbes, covariance complète, percentiles et règle de décision approuvée. |
| WellScan aide : BHADesign, BHADetailedDescription | Cordes simplifiées pour pre-analysis ; BHA détaillés dans autres calculs, assemblage depuis bit | Éléments géométriques saisis et masses | Librairie matériaux, connexions, profil outils, rigidité, contacts. |
| WellScan aide : ReportingIntro | Profil de rapport avec modèle Word personnalisé et variables | Rapport HTML imprimable simple | Étudier vrais rapports et schémas de signature / annexes ; génération docx/pagination. |
| Drive : 102a Introduction to BHA Modeling | Inputs rock/bit/BHA/well/opérations ; sorties 3D deflection, bit tilt, BUR/TUR, contacts | Non calculé | Cas réels et solveur couplé validé. |
| Drive : 103a/b/c TnDnB ; 104a/b Dynamics | Corpus trouvé et catalogué | Pas de solveur avancé | Relecture intégrale, extraction structurée des équations et résultats et validation. |
| Drive : WellView / Wellview U122 | Dossiers identifiés mais pas de rapport opérationnel WellView représentatif examiné dans ce tour | Aucun clonage de rapport | Identification avec l'utilisateur d'un rapport expurgé et vérification de son schéma. |
| Drive : HNP | Recherche de nom HNP ambiguë ; source non identifiée avec certitude | Non intégré | Retrouver la famille documentaire par emplacement ou référence exacte. |

## Portée de l'ALPHA
La progression de l'analyse documentaire est **partielle**. Ne pas interpréter la V0.2 comme une lecture exhaustive du Drive ni une reproduction mathématique de WellScan. Le catalogue de dépendances et la séparation entre modèles démonstratifs et modèles certifiés font partie du produit.
