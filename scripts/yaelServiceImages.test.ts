import { describe, expect, it } from "vitest";
import { yaelServiceImage, yaelServiceImages } from "./yaelServiceImages";

describe("Yael service images", () => {
  it("maps an image to every current service slug", () => {
    expect(Object.keys(yaelServiceImages).sort()).toEqual(
      ["gel-polish", "manicure", "mini-pedicure", "pedicure", "pedicure-manicure"].sort(),
    );
    for (const slug of Object.keys(yaelServiceImages)) {
      expect(yaelServiceImage(slug)).toMatch(/^\/assets\/yael-.+\.jpg$/);
    }
  });
});
