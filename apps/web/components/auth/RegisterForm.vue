<script setup lang="ts">
import type { RegisterPayload } from '@libheros/contracts';
import { AUTH_FIELD_LIMITS } from '~/constants/auth.constants';
import { AppRoutes } from '~/constants/api.routes';
import { useAuthStore } from '~/stores/auth';
import { getApiErrorMessage } from '~/utils/api-error';
import type { AuthFieldErrors } from '~/utils/auth-validation';
import { validateRegisterPayload } from '~/utils/auth-validation';

const authStore = useAuthStore();

const form = reactive<RegisterPayload>({
  firstName: '',
  lastName: '',
  email: '',
  emailConfirmation: '',
  password: '',
  passwordConfirmation: '',
});

const fieldErrors = ref<AuthFieldErrors>({});
const formError = ref<string | null>(null);
const isSubmitting = ref(false);

async function onSubmit(): Promise<void> {
  formError.value = null;
  fieldErrors.value = validateRegisterPayload(form);

  if (Object.keys(fieldErrors.value).length > 0) {
    return;
  }

  isSubmitting.value = true;

  try {
    await authStore.register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      emailConfirmation: form.emailConfirmation.trim(),
      password: form.password,
      passwordConfirmation: form.passwordConfirmation,
    });
    await navigateTo(AppRoutes.home);
  } catch (error) {
    formError.value = getApiErrorMessage(error, 'Unable to create your account. Please try again.');
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

    <div class="grid gap-4 sm:grid-cols-2">
      <AuthTextField
        id="register-first-name"
        v-model="form.firstName"
        label="First name"
        autocomplete="given-name"
        required
        :maxlength="AUTH_FIELD_LIMITS.firstNameMaxLength"
        :disabled="isSubmitting"
        :error="fieldErrors.firstName"
      />
      <AuthTextField
        id="register-last-name"
        v-model="form.lastName"
        label="Last name"
        autocomplete="family-name"
        required
        :maxlength="AUTH_FIELD_LIMITS.lastNameMaxLength"
        :disabled="isSubmitting"
        :error="fieldErrors.lastName"
      />
    </div>

    <AuthTextField
      id="register-email"
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
      id="register-email-confirmation"
      v-model="form.emailConfirmation"
      label="Confirm email"
      type="email"
      autocomplete="email"
      required
      :maxlength="AUTH_FIELD_LIMITS.emailMaxLength"
      :disabled="isSubmitting"
      :error="fieldErrors.emailConfirmation"
    />

    <AuthTextField
      id="register-password"
      v-model="form.password"
      label="Password"
      type="password"
      autocomplete="new-password"
      required
      :maxlength="AUTH_FIELD_LIMITS.passwordMaxLength"
      :disabled="isSubmitting"
      :error="fieldErrors.password"
    />

    <AuthTextField
      id="register-password-confirmation"
      v-model="form.passwordConfirmation"
      label="Confirm password"
      type="password"
      autocomplete="new-password"
      required
      :maxlength="AUTH_FIELD_LIMITS.passwordMaxLength"
      :disabled="isSubmitting"
      :error="fieldErrors.passwordConfirmation"
    />

    <button
      type="submit"
      class="lh-btn-primary w-full"
      :disabled="isSubmitting"
      :aria-busy="isSubmitting"
    >
      {{ isSubmitting ? 'Creating account…' : 'Create account' }}
    </button>
  </form>
</template>
