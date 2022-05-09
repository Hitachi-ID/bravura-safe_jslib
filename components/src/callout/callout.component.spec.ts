import { ComponentFixture, TestBed } from "@angular/core/testing";
import { I18nMockService } from "src/utils/i18n-mock.service";

import { I18nService } from "jslib-common/abstractions/i18n.service";

import { CalloutComponent } from ".";

describe("Callout", () => {
  let component: CalloutComponent;
  let fixture: ComponentFixture<CalloutComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CalloutComponent],
      providers: [
        {
          provide: I18nService,
          useFactory: () =>
            new I18nMockService({
              warning: "Warning",
              error: "Error",
            }),
        },
      ],
    });
    fixture = TestBed.createComponent(CalloutComponent);
    component = fixture.componentInstance;
  });

  describe("default state", () => {
    it("success", () => {
      component.type = "success";
      fixture.detectChanges();
      expect(component.title).toBeUndefined();
      expect(component.icon).toBe("fa-check");
      expect(component.headerClass).toBe("!tw-text-success");
    });

    it("info", () => {
      component.type = "info";
      fixture.detectChanges();
      expect(component.title).toBeUndefined();
      expect(component.icon).toBe("fa-info-circle");
      expect(component.headerClass).toBe("!tw-text-info");
    });

    it("warning", () => {
      component.type = "warning";
      fixture.detectChanges();
      expect(component.title).toBe("Warning");
      expect(component.icon).toBe("fa-warning");
      expect(component.headerClass).toBe("!tw-text-warning");
    });

    it("danger", () => {
      component.type = "danger";
      fixture.detectChanges();
      expect(component.title).toBe("Error");
      expect(component.icon).toBe("fa-bolt");
      expect(component.headerClass).toBe("!tw-text-danger");
    });
  });
});
