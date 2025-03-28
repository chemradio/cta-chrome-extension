// function updateValue() {
//     document.getElementById("dpiValue").textContent =
//         document.getElementById("dpiSlider").value;
// }
// alert("Hello from your Chrome extension!");

document.addEventListener("DOMContentLoaded", function () {
    const slider = document.getElementById("dpiSlider");
    const valueDisplay = document.getElementById("dpiValue");

    // Add event listener for input event on the slider
    slider.addEventListener("input", function () {
        valueDisplay.textContent = slider.value;
    });
});
