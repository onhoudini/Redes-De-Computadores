/*
 * Configuração do tutor de IA (assets/tutor.js).
 *
 * ATENÇÃO: o site é estático, então a chave abaixo fica visível para qualquer
 * pessoa que abrir o código da página, e todos os visitantes dividem o limite
 * de pedidos dela. Se o repositório for público no GitHub, o OpenRouter pode
 * revogar a chave automaticamente. Use uma chave com limite de gasto baixo.
 *
 * Se a chave ficar vazia ou for recusada, o tutor pede ao aluno que cole a
 * própria chave, que fica guardada só no navegador dele.
 */
window.TUTOR_CONFIG = {
    chave: "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",                                   // cole aqui a chave do OpenRouter (sk-or-v1-...)
    modelo: "google/gemma-4-26b-a4b-it:free",    // Google: Gemma 4 26B A4B (gratuito)
    // Modelos tentados, em ordem, se o principal falhar ou estiver sobrecarregado
    // (por exemplo "google/gemma-4-26b-a4b-it", a versão paga do mesmo modelo).
    reservas: [],
    url: "https://openrouter.ai/api/v1/chat/completions"
};
