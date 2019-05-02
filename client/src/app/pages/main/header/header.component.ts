import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'main-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {

  isLoggedIn: boolean;
  constructor() {
    this.isLoggedIn = false;
  }

  ngOnInit(): void {
    if (localStorage.getItem('user')) {
      this.isLoggedIn = true;
    }
  }
}
