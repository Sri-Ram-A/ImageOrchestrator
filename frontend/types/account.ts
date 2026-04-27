export type UserProfile = {
    id: number;
    username: string;
    email: string;
    date_joined: string;
};

export type AuthTokens = {
    access: string;
    refresh: string;
};

export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
};

export type LoginRequest = {
    username: string;
    password: string;
};

export type RegisterResponse = {
    user: UserProfile;
    access: string;
    refresh: string;
};

export type LoginResponse = {
    access: string;
    refresh: string;
};

export type ApiErrorShape = {
    detail?: string;
    message?: string;
    [key: string]: unknown;
};