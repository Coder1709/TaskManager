import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should display login page', async ({ page }) => {
        await page.goto('/login');

        await expect(page.locator('h1')).toContainText('Lite Jira');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
    });

    test('should navigate to signup page', async ({ page }) => {
        await page.goto('/login');

        await page.click('text=Sign up');

        await expect(page).toHaveURL('/signup');
        await expect(page.locator('h1')).toContainText('Create Account');
    });

    test('should show validation errors on empty form submit', async ({ page }) => {
        await page.goto('/login');

        await page.click('button[type="submit"]');

        // Form should show validation (HTML5 validation)
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should show signup form fields', async ({ page }) => {
        await page.goto('/signup');

        await expect(page.locator('input[id="name"]')).toBeVisible();
        await expect(page.locator('input[id="email"]')).toBeVisible();
        await expect(page.locator('input[id="password"]')).toBeVisible();
        await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Create account');
    });
});

test.describe('Protected Routes', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
        await page.goto('/dashboard');

        await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing tasks', async ({ page }) => {
        await page.goto('/tasks');

        await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing projects', async ({ page }) => {
        await page.goto('/projects');

        await expect(page).toHaveURL('/login');
    });

    test('should redirect to login when accessing reports', async ({ page }) => {
        await page.goto('/reports');

        await expect(page).toHaveURL('/login');
    });
});

test.describe('Navigation', () => {
    test('should navigate between auth pages', async ({ page }) => {
        await page.goto('/login');

        // Go to signup
        await page.click('text=Sign up');
        await expect(page).toHaveURL('/signup');

        // Go back to login
        await page.click('text=Sign in');
        await expect(page).toHaveURL('/login');
    });
});

test.describe('Responsive Design', () => {
    test('login page should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/login');

        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
});
