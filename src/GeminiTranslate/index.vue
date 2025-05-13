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

const props = defineProps({
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
const debounceTimer = ref<number | null>(null);

// 防抖处理函数
function debounceTranslate(): void {
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
  debounceTimer.value = window.setTimeout(() => {
    handleTranslate();
  }, 500); // 500ms 的延迟
}

// 在 onMounted 中修改
onMounted(() => {
  const currentConfig = getCurrentConfig();
  config.value = {
    apiKey: currentConfig.apiKey || '',
    proxy: currentConfig.proxy || '',
    model: currentConfig.model || 'gemini-2.0-flash'
  };
  if (props.enterAction.type === 'over' && props.enterAction.payload) {
    sourceText.value = props.enterAction.payload;
    handleTranslate();
  };
  utools.setSubInput(({ text }) => {
    sourceText.value = text;
    debounceTranslate();
  }, '翻译文本');
});

// 保存配置
function saveSettings(): void {
  const success = updateConfig(config.value.apiKey, config.value.proxy, config.value.model);
  if (success) {
    showNotification('配置保存成功');
    showConfig.value = false;
  } else {
    showNotification('配置保存失败', 'error');
  }
}

async function handleTranslate(): Promise<void> {
  if (!sourceText.value.trim()) return;
  if (!config.value.apiKey) {
    showNotification('请先配置API密钥', 'error');
    showConfig.value = true;
    return;
  }

  isTranslating.value = true;
  try {
    const result = await translate(sourceText.value);
    translationResult.value = JSON.parse(result);
  } catch (error) {
    console.error('翻译出错：', error);
    showNotification('翻译失败：' + (error as Error).message, 'error');
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

// 添加消息提示相关的响应式数据
const showMessage = ref<boolean>(false);
const messageText = ref<string>('');
const messageType = ref<'success' | 'error'>('success');

// 显示消息的函数
function showNotification(text: string, type: 'success' | 'error' = 'success'): void {
  messageText.value = text;
  messageType.value = type;
  showMessage.value = true;
  setTimeout(() => {
    showMessage.value = false;
  }, 3000);
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

    <!-- 消息提示组件 -->
    <transition name="message-fade">
      <div v-if="showMessage" :class="['message', messageType]">
        {{ messageText }}
      </div>
    </transition>
  </div>
</template>

<style>
@import './styles/global.css';
</style>

<style scoped>
@import './styles/index.css';
</style>