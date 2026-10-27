// RG-depot-designe-par-le-visiteur : le dépôt figure dans l'adresse de chaque page, pour qu'un lien partagé ouvre la même fiche du même dépôt. L'adresse passe par le fragment (`#/…`) : un hébergement de fichiers sert alors `index.html` quelle que soit la page (INV-2).

import {
  createRouter,
  createWebHashHistory,
  type RouterHistory,
} from "vue-router";
import AccueilPage from "./pages/AccueilPage.vue";
import AnimalPage from "./pages/AnimalPage.vue";
import AnimauxPage from "./pages/AnimauxPage.vue";
import CulturePage from "./pages/CulturePage.vue";
import DepotCadre from "./pages/DepotCadre.vue";
import ElevagePage from "./pages/ElevagePage.vue";
import EmplacementPage from "./pages/EmplacementPage.vue";
import FamillePage from "./pages/FamillePage.vue";
import InstallationPage from "./pages/InstallationPage.vue";
import PlantePage from "./pages/PlantePage.vue";
import PlantesPage from "./pages/PlantesPage.vue";
import ProcedurePage from "./pages/ProcedurePage.vue";
import SaisieDuDepotPage from "./pages/SaisieDuDepotPage.vue";

export function creerRouteur(
  historique: RouterHistory = createWebHashHistory(),
) {
  return createRouter({
    history: historique,
    routes: [
      { path: "/", name: "saisie", component: SaisieDuDepotPage },
      {
        path: "/:proprietaire/:depot",
        component: DepotCadre,
        children: [
          { path: "", name: "accueil", component: AccueilPage },
          { path: "plantes", name: "plantes", component: PlantesPage },
          { path: "plantes/:id", name: "plante", component: PlantePage },
          { path: "cultures/:id", name: "culture", component: CulturePage },
          {
            path: "emplacements/:id",
            name: "emplacement",
            component: EmplacementPage,
          },
          { path: "familles/:id", name: "famille", component: FamillePage },
          { path: "animaux", name: "animaux", component: AnimauxPage },
          { path: "animaux/:id", name: "animal", component: AnimalPage },
          { path: "elevages/:id", name: "elevage", component: ElevagePage },
          {
            path: "installations/:id",
            name: "installation",
            component: InstallationPage,
          },
          {
            path: "procedures/:id",
            name: "procedure",
            component: ProcedurePage,
          },
        ],
      },
      { path: "/:pathMatch(.*)*", redirect: "/" },
    ],
    scrollBehavior: () => ({ top: 0 }),
  });
}
