<script setup lang="ts">
defineProps<{
  id: string;
  label: string;
  modelValue: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxlength?: number;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="lh-label">
      {{ label }}
      <span v-if="required" class="text-lh-coral" aria-hidden="true">*</span>
    </label>
    <textarea
      :id="id"
      :value="modelValue"
      :rows="rows ?? 4"
      :disabled="disabled"
      :required="required"
      :maxlength="maxlength"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="lh-input resize-y"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" :id="`${id}-error`" class="text-sm text-lh-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
