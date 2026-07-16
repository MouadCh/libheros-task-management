<script setup lang="ts">
import { AUTH_FIELD_LIMITS } from '~/constants/auth.constants';
import { AppRoutes } from '~/constants/api.routes';
import { useAuthStore } from '~/stores/auth';
import { getApiErrorMessage } from '~/utils/api-error';
import type { AuthFieldErrors } from '~/utils/auth-validation';
import { validateLoginPayload } from '~/utils/auth-validation';

const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
});

const fieldErrors = ref<AuthFieldErrors>({});
const formError = ref<string | null>(null);
const isSubmitting = ref(false);

async function onSubmit(): Promise<void> {
  formError.value = null;
  fieldErrors.value = validateLoginPayload(form);

  if (Object.keys(fieldErrors.value).length > 0) {
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.login({
      email: form.email.trim(),
      password: form.password,
    });
    await navigateTo(AppRoutes.home);
  } catch (error) {
    formError.value = getApiErrorMessage(error, 'Unable to sign in. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <p v-if="formError" class="lh-alert-error" role="alert">
      {{ formError }}
    </p>

    <AuthTextField
      id="login-email"
      v-model="form.email"
      label="Email"
      type="email"
      autocomplete="email"
      required
      :maxlength="AUTH_FIELD_LIMITS.emailMaxLength"
      :disabled="isSubmitting"
      :error="fieldErrors.email"
    />

    <AuthTextField
      id="login-password"
      v-model="form.password"
      label="Password"
      type="password"
      autocomplete="current-password"
      required
      :maxlength="AUTH_FIELD_LIMITS.passwordMaxLength"
      :disabled="isSubmitting"
      :error="fieldErrors.password"
    />

    <button
      type="submit"
      class="lh-btn-primary w-full"
      :disabled="isSubmitting"
      :aria-busy="isSubmitting"
    >
      {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
    </button>
  </form>
</template>
