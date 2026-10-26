import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import App from "./App.vue";

describe("App", () => {
  it("pose la question à laquelle Skarden répond", () => {
    const page = mount(App);
    expect(page.find("h1").text()).toBe("Skarden");
    expect(page.text()).toContain(
      "Que faut-il à chacune de mes plantes, et qu'ai-je appris en les cultivant ?",
    );
  });

  it("renvoie vers le dépôt de données, seule source des fiches", () => {
    const lien = mount(App).find(
      "a[href='https://github.com/sskorupski/skarden']",
    );
    expect(lien.exists()).toBe(true);
  });
});
