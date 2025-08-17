// Category configurations for ZEDSON Watchcraft - Browser version
const categories = {
    inventory: [
        {
            name: 'Watch',
            config: {
                fields: ['brand', 'gender', 'type', 'strap'],
                brand: { type: 'autocomplete', required: true },
                gender: { type: 'select', options: ['Gents', 'Ladies'], required: true },
                type: { type: 'select', options: ['Analog', 'Digital'], required: true },
                strap: { type: 'select', options: ['Leather', 'Chain', 'Fiber'], required: true }
            }
        },
        {
            name: 'WallClocks',
            config: {
                fields: ['brand', 'type'],
                brand: { type: 'autocomplete', required: true },
                type: { type: 'select', options: ['Analog', 'Digital'], required: true }
            }
        },
        {
            name: 'Timepieces',
            config: {
                fields: ['brand', 'type'],
                brand: { type: 'autocomplete', required: true },
                type: { type: 'select', options: ['Analog', 'Digital'], required: true }
            }
        },
        {
            name: 'Strap',
            config: {
                fields: ['brand', 'material', 'size'],
                brand: { type: 'autocomplete', required: true },
                material: { type: 'select', options: ['Leather', 'Chain', 'Fiber'], required: true },
                size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true }
            }
        },
        {
            name: 'Spring Bar',
            config: {
                fields: ['size'],
                size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true }
            }
        },
        {
            name: 'Loop',
            config: {
                fields: ['size', 'material'],
                size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true },
                material: { type: 'select', options: ['Leather', 'Fiber'], required: true }
            }
        },
        {
            name: 'Buckle',
            config: {
                fields: ['size'],
                size: { type: 'select', options: ['8MM', '10MM', '12MM', '14MM', '16MM', '18MM', '20MM', '22MM', '24MM', '26MM', '28MM'], required: true }
            }
        }
    ],
    
    service: {
        status: [
            'Yet to Start',
            'Delivered', 
            'In Service Center',
            'Yet to Send Parrys',
            'In Parrys',
            'To Return to Customer',
            'Service Completed',
            'Waiting for Customer to Pickup'
        ],
        locations: ['Semmancheri', 'Navalur', 'Padur'],
        caseTypes: ['Steel', 'Gold Tone', 'Fiber'],
        strapTypes: ['Leather', 'Fiber', 'Steel', 'Gold Plated'],
        instantServiceTypes: [
            'Battery Change',
            'Link Removal / Addition', 
            'Other'
        ]
    },
    
    payment: {
        modes: ['UPI', 'Cash', 'Card', 'Multiple Payment Modes']
    },
    
    invoice: {
        prefixes: {
            sale: 'INVSA',
            service: 'INVSR',
            acknowledgement: 'ACKSR'
        }
    }
};

// Make categories globally available
if (typeof window !== 'undefined') {
    window.categories = categories;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = categories;
}