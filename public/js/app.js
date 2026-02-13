const conceptProff = document.querySelector('#conceptProff')
const bankModal = document.querySelector('#bankConnectModal')
const myModal = new bootstrap.Modal(bankModal);
    conceptProff.addEventListener('click',()=>{
        myModal.show()
    })