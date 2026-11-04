const prohibitedLatinContent =
  /(?<![\p{L}\p{N}])(?:qur.?an|koran|had(?:is|ith)|isl[aä]m(?:ic|iy)?|diniy|din|namoz|ibodat|masjid|ramazon|ramadan|ro.?za|alloh|allah|payg.?ambar|prophet|worship|religio(?:n|us)|mosque|prayer|fasting|sunn(?:at|ah)|tajw(?:eed|id)|xudo|xristian[\p{L}]*|nasron[\p{L}]*|yahud[\p{L}]*|budda(?:izm|hist)?|cherkov|muqaddas|e.?tiqod|god|church|bible|jesus|christian[\p{L}]*|jew(?:ish|s)?|judaism|buddh(?:ism|ist)?|spiritual|коран[\p{L}]*|хадис[\p{L}]*|ислам[\p{L}]*|религи[\p{L}]*|молитв[\p{L}]*|мечет[\p{L}]*|пророк[\p{L}]*|рамадан[\p{L}]*|аллах[\p{L}]*|христиан[\p{L}]*|иудаизм|церков[\p{L}]*|библи[\p{L}]*|иисус|буддизм|духовн[\p{L}]*|бог)(?![\p{L}\p{N}])/iu;
const prohibitedArabicContent =
  /(?:^|[\s.,!?؟،؛:()[\]{}"'`])(?:الله|القرآن|قرآن|حديث|الحديث|الإسلام|اسلام|النبي|نبي|الرسول|رسول|الصلاة|صلاة|المسجد|مسجد|الصوم|صوم|رمضان|آية|آيات|سورة|الزكاة|الحج|الإنجيل|إنجيل|المسيح|المسيحية|كنيسة|الكنيسة|يهودي|اليهود|اليهودية|بوذي|البوذية|الإيمان|عقيدة)(?=$|[\s.,!?؟،؛:()[\]{}"'`])/u;

export function containsReligiousMaterial(value: unknown): boolean {
  const text = String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '');

  return prohibitedLatinContent.test(text) || prohibitedArabicContent.test(text);
}
