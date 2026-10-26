import { createApp } from "vue";
import App from "./App.vue";
import { CLE_OUVRIR_DEPOT, ouvrirDepotSurGithub } from "./depot/ouvrir";
import { creerRouteur } from "./routeur";
import "./style.css";

createApp(App)
  .use(creerRouteur())
  .provide(CLE_OUVRIR_DEPOT, ouvrirDepotSurGithub)
  .mount("#app");
