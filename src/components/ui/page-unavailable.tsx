export const PAGE_UNAVAILABLE_MESSAGE = "Bu bölüm şu anda kullanılamıyor.";

export function PageUnavailable() {
  return (
    <div className="flex h-full flex-1 items-center px-5 sm:px-8 lg:px-12">
      <p className="font-heading text-2xl text-color_textsecondary italic">
        {PAGE_UNAVAILABLE_MESSAGE}
      </p>
    </div>
  );
}
