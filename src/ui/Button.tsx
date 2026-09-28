import { forwardRef, type ButtonHTMLAttributes } from "react";
import { btn, type BtnVariant } from "./buttons";

// `btn()`'in bileşen hâli (spec §6.2). Sınıf dizesi `btn()`'de kalıyor —
// `DIALOG_CONFIRM_BUTTON` gibi sabitler ve bileşen kullanamayan yerler onu
// doğrudan kullanmaya devam ediyor.
//
// Boylar spec'teki iki kademe: `sm` 32px (araç şeritleri), `md` 40px (pencere
// ayakları, birincil eylemler). `btn()`'in 36px'lik `md`'si bileşende yok;
// ekranlar 2. alt projede taşınırken ihtiyaç çıkarsa buraya eklenir.
//
// Varsayılan `type="button"`: HTML'de düğmenin varsayılanı `submit` ve bir
// formun içine konan her düğme — "Göster", "Ekle" — formu gönderiyordu.

export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "neutral", size = "md", type = "button", className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={btn(variant, size === "sm" ? "sm" : "lg", className ?? "")}
      {...rest}
    />
  );
});
