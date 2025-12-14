// Fix product image path
fetch('http://localhost:8080/api/products/12', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    id: 12,
    title: "dfe",
    description: "rwr\n<!--META:{\"productType\":\"tshirts\",\"displayLocations\":\"tshirts\",\"originalPrice\":222,\"offerPrice\":111,\"images\":\"\"}-->",
    price: 111,
    stock: 2,
    category: "tshirts",
    brand: "doo",
    imagePath: "img/products/c3-2.png"
  })
})
.then(response => response.json())
.then(data => console.log('Product updated:', data))
.catch(error => console.error('Error updating product:', error));
