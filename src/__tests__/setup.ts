// Globale Jest-Setup-Datei

// Mock für window.matchMedia
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

// Mock für document.createRange
document.createRange = () => {
    const range = {
        setStart: () => {},
        setEnd: () => {},
        // Die wichtigsten Eigenschaften für Node
        commonAncestorContainer: document.body
    };
    return range as any;
}; 