import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";

type BannerTypes = "premium" | "info" | "warning" | "danger";

const defaultIcon: Record<BannerTypes, string> = {
  premium: "fa-star",
  info: "fa-info-circle",
  warning: "fa-exclamation-triangle",
  danger: "fa-error",
};

@Component({
  selector: "bit-banner",
  templateUrl: "./banner.component.html",
})
export class BannerComponent implements OnInit {
  @Input("bannerType") bannerType: BannerTypes = "info";
  @Input() icon: string;
  @Input() useAlertRole = true;

  @Output() onClose = new EventEmitter<void>();

  ngOnInit(): void {
    this.icon ??= defaultIcon[this.bannerType];
  }

  get bannerClass() {
    switch (this.bannerType) {
      case "danger":
        return "tw-bg-danger-500";
      case "info":
        return "tw-bg-info-500";
      case "premium":
        return "tw-bg-success-500";
      case "warning":
        return "tw-bg-warning-500";
    }
  }
}
