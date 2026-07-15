function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanSourceSuffix(story) {
  let title = story.originalTitle || story.title;
  for (const link of story.sourceLinks || []) {
    title = title.replace(new RegExp(`\\s*(?:[-–—|]\\s*)?${escapeRegExp(link.name)}\\s*$`, "i"), "").trim();
  }
  return title || story.originalTitle || story.title;
}

function sourceLanguage(text) {
  return /[\u0980-\u09ff]/.test(text) ? "bn" : "en";
}

export async function translateHeadlines(stories) {
  if (process.env.LOCAL_TRANSLATION !== "1") return { translated: 0, status: "本地翻译未启用" };
  const candidates = stories
    .filter((story) => !story.aiEnhanced && !story.machineTranslated)
    .slice(0, Math.max(0, Number(process.env.LOCAL_TRANSLATION_LIMIT || 40)));
  if (!candidates.length) return { translated: 0, status: "已复用中文标题" };

  try {
    const { env, pipeline } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.cacheDir = process.env.HF_HOME || ".cache/huggingface";
    const translator = await pipeline("translation", "Xenova/m2m100_418M", { dtype: "q8" });
    let translated = 0;
    for (const story of candidates) {
      const originalTitle = cleanSourceSuffix(story);
      const result = await translator(originalTitle, {
        src_lang: sourceLanguage(originalTitle), tgt_lang: "zh", max_new_tokens: 128,
      });
      const chineseTitle = result?.[0]?.translation_text?.replace(/\s+/g, " ").trim();
      if (!chineseTitle || chineseTitle === originalTitle) continue;
      story.originalTitle = story.originalTitle || story.title;
      story.title = chineseTitle.replace(/[。.]$/, "");
      story.machineTranslated = true;
      story.ruleTranslated = false;
      translated += 1;
    }
    await translator.dispose?.();
    return { translated, status: `开源模型已翻译${translated}条标题` };
  } catch (error) {
    console.warn(`Local translation unavailable: ${error.message}`);
    return { translated: 0, status: `本地翻译暂时不可用：${error.message}` };
  }
}
