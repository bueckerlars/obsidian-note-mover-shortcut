// Globale Jest-Setup-Datei

// Mock for window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock for document.createRange
document.createRange = () => {
    const range = {
        setStart: () => {},
        setEnd: () => {},
        // Essential properties for Node
        commonAncestorContainer: document.body
    };
    return range as any;
}; 

// Empty export to make the file a module
export {}; 