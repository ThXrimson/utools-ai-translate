<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { translate, updateConfig, getCurrentConfig } from './translate';

interface Config {
  apiKey: string;
  proxy: string;
  model: string;
}

interface Definition {
  definition: string;
  type: string;
  examples?: string[];
}

interface VocabularyItem {
  text?: string;
  pronunciation?: string;
  definitions: Definition[];
}

interface TranslationResult {
  text: string;
  translation?: string;
  vocabulary?: VocabularyItem[];
}

defineProps({
  enterAction: {
    type: Object,
    required: true
  }
});

const sourceText = ref<string>('');
const translationResult = ref<TranslationResult | null>(null);
const isTranslating = ref<boolean>(false);
const showConfig = ref<boolean>(false);

// 配置相关的响应式数据
const config = ref<Config>({
  apiKey: '',
  proxy: '',
  model: 'gemini-2.0-flash'
});

// 加载配置
onMounted(() => {
  console.log('getCurrentConfig')
  const currentConfig = getCurrentConfig();
  console.log(currentConfig);
  config.value = {
    apiKey: currentConfig.apiKey || '',
    proxy: currentConfig.proxy || '',
    model: currentConfig.model || 'gemini-2.0-flash'
  };
});

// 保存配置
function saveSettings(): void {
  const success = updateConfig(config.value.apiKey, config.value.proxy, config.value.model);
  if (success) {
    window.utools.showNotification('配置保存成功');
    showConfig.value = false;
  } else {
    window.utools.showNotification('配置保存失败');
  }
}

async function handleTranslate(): Promise<void> {
  if (!sourceText.value.trim()) return;
  if (!config.value.apiKey) {
    window.utools.showNotification('请先配置API密钥');
    showConfig.value = true;
    return;
  }

  isTranslating.value = true;
  try {
    const result = await translate(sourceText.value);
    translationResult.value = JSON.parse(result);
  } catch (error) {
    console.error('翻译出错：', error);
    window.utools.showNotification('翻译失败：' + (error as Error).message);
    translationResult.value = null;
  } finally {
    isTranslating.value = false;
  }
}

// 按词性分组定义
function groupDefinitionsByType(definitions: Definition[]): Record<string, Definition[]> {
  return definitions.reduce((groups, def) => {
    if (!groups[def.type]) {
      groups[def.type] = [];
    }
    groups[def.type].push(def);
    return groups;
  }, {} as Record<string, Definition[]>);
}
</script>

<template>
  <div class="gemini-translate">
    <!-- 顶部应用栏 -->
    <div class="app-bar">
      <h1>Gemini 翻译</h1>
      <button class="md-button" @click="showConfig = !showConfig">
        <span class="material-icons">{{ showConfig ? 'close' : 'settings' }}</span>
      </button>
    </div>

    <!-- 配置面板 -->
    <div v-if="showConfig" class="config-panel md-elevation-2">
      <div class="config-header">
        <span class="material-icons">settings</span>
        <h3>设置</h3>
      </div>
      <hr class="section-divider">
      <div class="config-content">
        <div class="config-item">
          <label>API密钥</label>
          <div class="input-wrapper">
            <span class="material-icons">key</span>
            <input type="text" v-model="config.apiKey" placeholder="请输入Gemini API密钥" />
          </div>
        </div>
        <div class="config-item">
          <label>代理地址</label>
          <div class="input-wrapper">
            <span class="material-icons">dns</span>
            <input type="text" v-model="config.proxy" placeholder="可选，如：http://localhost:7890" />
          </div>
        </div>
        <div class="config-item">
          <label>模型</label>
          <div class="input-wrapper">
            <span class="material-icons">smart_toy</span>
            <input type="text" v-model="config.model" placeholder="默认：gemini-2.0-flash" />
          </div>
        </div>
      </div>
      <hr class="section-divider">
      <div class="config-actions">
        <button class="md-button" @click="showConfig = false">取消</button>
        <button class="md-button primary" @click="saveSettings">保存</button>
      </div>
    </div>

    <div class="translate-container">
      <!-- 输入区域 -->
      <div class="input-area md-elevation-1">
        <div class="input-header">
          <span class="material-icons">edit</span>
          <span class="input-tip">输入文本</span>
        </div>
        <textarea v-model="sourceText" placeholder="请输入要翻译的文本，支持英文和中文互译" rows="4" class="md-textarea"></textarea>
      </div>

      <!-- 翻译按钮 -->
      <div class="action-area">
        <button class="md-button primary elevated" :disabled="isTranslating || !sourceText.trim()"
          @click="handleTranslate">
          <span class="material-icons">translate</span>
          {{ isTranslating ? '翻译中...' : '翻译' }}
        </button>
      </div>

      <!-- 输出区域 -->
      <div v-if="translationResult" class="output-area">
        <!-- 翻译结果 -->
        <div v-if="translationResult.translation" class="translation-section md-elevation-1">
          <div class="section-header">
            <span class="material-icons">description</span>
            <h3>翻译</h3>
          </div>
          <hr class="section-divider">
          <div class="translation-content">
            {{ translationResult.translation }}
          </div>
        </div>

        <!-- 词汇解释 -->
        <div v-if="translationResult.vocabulary" class="vocabulary-section">
          <div class="vocabulary-card md-elevation-1">
            <div class="section-header">
              <span class="material-icons">book</span>
              <h3>词汇详解</h3>
            </div>
            <hr class="section-divider">
            <div class="vocab-cards">
              <div v-for="(vocab, index) in translationResult.vocabulary" :key="index" class="vocab-card">
                <hr v-if="index != 0" class="section-divider">
                <h4>{{ vocab.text || '' }}
                  <span v-if="vocab.pronunciation" class="pronunciation">[{{ vocab.pronunciation }}]</span>
                </h4>
                <div v-for="(group, type) in groupDefinitionsByType(vocab.definitions)" :key="type"
                  class="definition-group">
                  <div v-if="type" class="word-type">
                    <span class="material-icons">label</span>
                    {{ type }}
                  </div>
                  <div class="definition-list">
                    <div v-for="(def, index) in group" :key="index" class="definition-item">
                      <p class="definition">{{ def.definition }}</p>
                      <ul v-if="def.examples?.length" class="examples">
                        <li v-for="(example, i) in def.examples" :key="i">
                          {{ example }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Material Design 变量 - 全局CSS变量 */
:root {
  --md-primary: #2196F3;
  /* 更鲜艳的蓝色 */
  --md-primary-dark: #1976D2;
  /* 深蓝色 */
  --md-secondary: #00BCD4;
  /* 青色作为次要色 */
  --md-error: #F44336;
  /* 更鲜艳的错误色 */
  --md-text-primary: rgba(0, 0, 0, 0.87);
  --md-text-secondary: rgba(0, 0, 0, 0.6);
  --md-surface: #ffffff;
  --md-background: #FAFAFA;
  /* 更浅的背景色 */
}

/* 全局字体设置 */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>

<style scoped>
.gemini-translate {
  padding: 0;
  background-color: var(--md-background);
  min-height: 100vh;
}

/* 应用栏 */
.app-bar {
  background-color: var(--md-primary);
  color: white;
  padding: 12px 20px;
  /* 减小内边距 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-bar .material-icons {
  color: white;
}

.app-bar h1 {
  margin: 0;
  font-size: 24px;
  /* 增大标题字号 */
  font-weight: 500;
  letter-spacing: 0.5px;
  /* 增加字母间距 */
}

/* Material Design 按钮 */
.md-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 36px;
  border: none;
  border-radius: 4px;
  font-size: 15px;
  /* 增大按钮文字 */
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: inherit;
}

.md-button.primary {
  background-color: var(--md-primary);
  color: white;
}

.md-button.elevated {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.md-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.md-button.primary:hover {
  background-color: var(--md-primary-dark);
}

.md-button:disabled {
  background-color: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.38);
  cursor: not-allowed;
}

/* Material Design 文本框 */
.md-textarea {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 4px;
  font-size: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.87);
  background: var(--md-surface);
  resize: vertical;
  transition: box-shadow 0.2s;
  box-sizing: border-box;
  /* 添加这行确保padding不会导致宽度溢出 */
  min-height: 120px;
  /* 设置最小高度 */
  max-height: 400px;
  /* 设置最大高度 */
}

.input-area {
  margin: 0 auto 24px;
  max-width: 700px;
  position: relative;
  /* 添加相对定位 */
  overflow: hidden;
  /* 防止内容溢出 */
  background: var(--md-surface);
  border-radius: 4px;
}

.md-textarea:focus {
  outline: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 容器布局 */
.translate-container {
  max-width: 700px;
  /* 减小最大宽度 */
  margin: 20px auto;
  /* 减小上下边距 */
  padding: 0 20px;
  /* 减小左右内边距 */
}

.input-area {
  margin: 0 auto 16px;
  /* 减小底部间距 */
  max-width: 700px;
}

.output-area {
  margin-top: 24px;
  /* 减小与翻译按钮的间距 */
}

/* 翻译按钮区域 */
.action-area {
  text-align: center;
  margin: 20px 0;
  /* 减小上下间距 */
}

.action-area .material-icons {
  color: white;
}

/* 翻译结果区域 */
.translation-section {
  background: var(--md-surface);
  padding: 24px;
  /* 减小内边距 */
  border-radius: 8px;
  /* 减小圆角 */
  margin-bottom: 24px;
  /* 减小与词汇详解的间距 */
}

.translation-section p {
  margin: 16px 0 0;
  /* 减小上边距 */
}

/* 词汇详解区域 */
.vocabulary-section {
  margin-top: 24px;
  /* 减小与翻译结果的间距 */
}

.vocabulary-card {
  background: var(--md-surface);
  border-radius: 8px;
  /* 减小圆角 */
  padding: 24px;
  /* 减小内边距 */
}

.vocab-cards {
  gap: 16px;
  /* 减小卡片间距 */
  margin-top: 16px;
  /* 减小顶部间距 */
}

.vocab-card {
  padding: 16px;
  /* 减小内边距 */
}

.vocab-card h4 {
  margin: 0 0 16px 0;
  /* 减小下边距 */
}

.definition-group {
  margin-bottom: 16px;
  /* 减小组间距 */
}

.definition-item {
  margin-bottom: 12px;
  /* 减小定义项间距 */
}

.examples {
  margin: 8px 0 0 16px;
  /* 减小缩进和间距 */
  padding-left: 12px;
}

.examples li {
  margin-bottom: 4px;
  /* 减小例句间距 */
}

.examples li {
  color: var(--md-text-secondary);
  font-size: 14px;
  margin-bottom: 6px;
  font-style: italic;
}

/* Material Design 阴影 */
.md-elevation-1 {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.md-elevation-2 {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* fallback */
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/materialicons/v143/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: 'liga';
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}

/* Material Icons 尺寸调整 */
.material-icons {
  font-size: 18px;
  /* 减小图标大小 */
  vertical-align: middle;
  color: var(--md-primary);
  opacity: 0.9;
}

/* 输入区域样式 */
.input-area {
  margin: 0 auto 16px;
  max-width: 700px;
  background: var(--md-surface);
  border-radius: 8px;
  overflow: hidden;
}

.input-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-tip {
  color: var(--md-text-secondary);
  font-size: 18px;
  font-weight: bold;
}

.md-textarea {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 0;
  /* 移除圆角，与外框融合 */
  font-size: 15px;
  line-height: 1.5;
  color: var(--md-text-primary);
  background: transparent;
  resize: vertical;
  transition: background-color 0.2s;
  box-sizing: border-box;
  min-height: 120px;
  max-height: 400px;
}

.md-textarea:focus {
  outline: none;
  background-color: rgba(0, 0, 0, 0.01);
}

/* 翻译结果区域 */
.translation-section {
  max-width: 700px;
  /* 与输入框保持一致 */
  margin: 0 auto 24px;
  background: var(--md-surface);
  padding: 24px;
  border-radius: 8px;
}

.translation-content {
  padding: 16px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--md-text-primary);
  border-radius: 4px;
}

/* 词汇详解区域 */
.vocabulary-card {
  max-width: 700px;
  /* 与输入框保持一致 */
  margin: 0 auto;
  background: var(--md-surface);
  border-radius: 8px;
  padding: 24px;
}

/* 词汇详解样式优化 */
.word-type {
  margin-left: 16px;
  margin-bottom: 12px;
  color: var(--md-text-secondary);
  font-weight: 500;
  font-size: 14px;
}

.definition-list {
  margin-left: 32px;
}

.definition-item {
  margin-bottom: 16px;
}

.definition {
  margin: 0;
  color: var(--md-text-primary);
  font-size: 15px;
  line-height: 1.5;
}

.examples {
  margin: 8px 0 0 16px;
  padding-left: 12px;
  border-left: 2px solid rgba(0, 0, 0, 0.08);
}

.examples li {
  color: var(--md-text-secondary);
  font-size: 14px;
  margin-bottom: 6px;
  font-style: italic;
  line-height: 1.4;
}

/* section header样式 */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--md-text-primary);
}

/* 分割线样式 */
.section-divider {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin: 16px 0;
}

.vocab-divider {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin: 20px 0;
  width: 100%;
}

/* 配置面板样式 */
.config-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--md-surface);
  border-radius: 8px;
  width: 90%;
  max-width: 480px;
  z-index: 1000;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
}

.config-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: var(--md-text-primary);
}

.config-content {
  padding: 0 24px;
}

.config-item {
  margin-bottom: 20px;
}

.config-item label {
  display: block;
  font-size: 14px;
  color: var(--md-text-secondary);
  margin-bottom: 8px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--md-background);
  border-radius: 4px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 1px var(--md-primary);
}

.input-wrapper .material-icons {
  font-size: 20px;
  color: var(--md-text-secondary);
}

.input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 15px;
  color: var(--md-text-primary);
  width: 100%;
}

.input-wrapper input:focus {
  outline: none;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
}
</style>