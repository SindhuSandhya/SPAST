import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
    {
        id: 1,
        label: 'Dashboard',
        icon: 'bx-home-circle',
        link: '/dashboard',
    },
    {
        id: 2,
        label: 'Tenants',
        icon: 'bx bx-building-house',
        link: '/tenants',

    },
    {
        id: 3,
        label: 'Users',
        icon: 'bx bx-user-plus',
        link: '/users',

    },
    {
        id: 4,
        label: 'Candidates',
        icon: 'bx bx-street-view',
        link: '/candidates',

    },


];

