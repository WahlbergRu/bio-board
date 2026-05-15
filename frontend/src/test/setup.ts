import '@testing-library/jest-dom';

// jsdom lacks scrollIntoView
Element.prototype.scrollIntoView = () => {};
