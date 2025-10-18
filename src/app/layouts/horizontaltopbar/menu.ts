
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
    {
        id: 5,
        label: 'Configuration',
        icon: 'bx bx-briefcase',
        link: '/configuration',
        subItems: [
            {
                id: 1,
                label: 'Competency List',
                link: '/configuration/competency-list'
            }
        ]
    }

];



