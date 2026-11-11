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
    chave: "REMOVIDA",                                   // cole aqui a chave do OpenRouter (sk-or-v1-...)
    modelo: "z-ai/glm-5.3-flash:floor",    // Google: Gemma 4 26B A4B (gratuito)
    // Modelos tentados, em ordem, se o principal falhar ou estiver sobrecarregado
    // (por exemplo "google/gemma-4-26b-a4b-it", a versão paga do mesmo modelo).
    reservas: [],
    url: "https://openrouter.ai/api/v1/chat/completions"
};
